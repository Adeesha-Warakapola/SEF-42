-- =====================================================================
-- Migration 002: real password hashing, session-token auth, admin-only
-- RPCs for role promotion & claim approval, and DB-level date checks.
--
-- Run this whole file once in the Supabase SQL Editor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Passwords: hash existing plaintext values, drop the plaintext column.
-- ---------------------------------------------------------------------
alter table users add column if not exists password_hash text;

update users
set password_hash = crypt(password, gen_salt('bf'))
where password_hash is null and password is not null;

alter table users alter column password_hash set not null;
alter table users drop column if exists password;

-- ---------------------------------------------------------------------
-- 2. Lock down direct table access from the browser (anon key). All
--    writes to users/claims now happen exclusively through the
--    SECURITY DEFINER functions below, which check authorization
--    themselves before touching the database.
-- ---------------------------------------------------------------------
revoke select on users from anon;
grant select (id, name, email, role) on users to anon;
revoke insert on users from anon;
revoke update on users from anon;

revoke update on claims from anon;

-- ---------------------------------------------------------------------
-- 3. Sessions: lightweight server-verified auth tokens. Never exposed
--    directly to the client's table access, only via RPCs.
-- ---------------------------------------------------------------------
create table if not exists sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
alter table sessions enable row level security;
revoke all on sessions from anon;

-- ---------------------------------------------------------------------
-- 4. Auth + admin RPCs
-- ---------------------------------------------------------------------

create or replace function _session_user(p_token uuid)
returns users
language plpgsql
security definer
set search_path = public
as $$
declare
  u users;
begin
  select users.* into u
  from sessions
  join users on users.id = sessions.user_id
  where sessions.token = p_token
    and sessions.expires_at > now();

  if u.id is null then
    raise exception 'Your session has expired. Please log in again.' using errcode = '28000';
  end if;

  return u;
end;
$$;

create or replace function register_user(p_name text, p_email text, p_password text)
returns table (token uuid, id uuid, name text, email text, role text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  new_token uuid;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;
  if p_email is null or p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters.' using errcode = '22023';
  end if;
  if exists (select 1 from users where lower(users.email) = lower(btrim(p_email))) then
    raise exception 'An account with that email already exists. Try logging in instead.' using errcode = '23505';
  end if;

  insert into users (name, email, role, password_hash)
  values (btrim(p_name), lower(btrim(p_email)), 'student', crypt(p_password, gen_salt('bf')))
  returning users.id into new_id;

  insert into sessions (user_id) values (new_id) returning sessions.token into new_token;

  return query select new_token, u.id, u.name, u.email, u.role from users u where u.id = new_id;
end;
$$;

create or replace function login_user(p_email text, p_password text)
returns table (token uuid, id uuid, name text, email text, role text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u users;
  new_token uuid;
begin
  select * into u from users where lower(users.email) = lower(btrim(p_email));

  if u.id is null or u.password_hash <> crypt(p_password, u.password_hash) then
    raise exception 'We could not find an account with that email and password.' using errcode = '28P01';
  end if;

  insert into sessions (user_id) values (u.id) returning sessions.token into new_token;

  return query select new_token, u.id, u.name, u.email, u.role;
end;
$$;

create or replace function current_session_user(p_token uuid)
returns table (id uuid, name text, email text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  u users;
begin
  u := _session_user(p_token);
  return query select u.id, u.name, u.email, u.role;
end;
$$;

create or replace function logout_user(p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from sessions where sessions.token = p_token;
$$;

create or replace function admin_promote_user(p_token uuid, p_target_user_id uuid)
returns table (id uuid, name text, email text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor users;
begin
  actor := _session_user(p_token);
  if actor.role <> 'admin' then
    raise exception 'Only admins can promote users.' using errcode = '42501';
  end if;

  update users set role = 'admin' where users.id = p_target_user_id;

  return query select u.id, u.name, u.email, u.role from users u where u.id = p_target_user_id;
end;
$$;

create or replace function admin_decide_claim(p_token uuid, p_claim_id uuid, p_decision text)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor users;
  target_found_item uuid;
  current_status text;
begin
  actor := _session_user(p_token);
  if actor.role <> 'admin' then
    raise exception 'Only admins can decide claims.' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision.' using errcode = '22023';
  end if;

  select claims.found_item_id, claims.status into target_found_item, current_status
  from claims where claims.id = p_claim_id;

  if target_found_item is null then
    raise exception 'Claim not found.' using errcode = 'P0002';
  end if;

  if current_status <> 'pending' then
    raise exception 'This claim has already been decided.' using errcode = '22023';
  end if;

  update claims set status = p_decision where claims.id = p_claim_id;

  if p_decision = 'approved' then
    update found_items set status = 'returned' where found_items.id = target_found_item;
  end if;

  return query select claims.id, claims.status from claims where claims.id = p_claim_id;
end;
$$;

grant execute on function register_user(text, text, text) to anon;
grant execute on function login_user(text, text) to anon;
grant execute on function current_session_user(uuid) to anon;
grant execute on function logout_user(uuid) to anon;
grant execute on function admin_promote_user(uuid, uuid) to anon;
grant execute on function admin_decide_claim(uuid, uuid, text) to anon;

-- ---------------------------------------------------------------------
-- 5. Date rules enforced at the database level: a lost/found date can
--    never be in the future, no matter how the row is written.
-- ---------------------------------------------------------------------
alter table lost_items
  drop constraint if exists lost_items_date_not_future;
alter table lost_items
  add constraint lost_items_date_not_future check (date <= current_date);

alter table found_items
  drop constraint if exists found_items_date_not_future;
alter table found_items
  add constraint found_items_date_not_future check (date <= current_date);
