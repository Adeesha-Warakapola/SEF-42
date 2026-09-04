-- =====================================================================
-- Migration 003: fix "function crypt(text, text) does not exist".
-- Supabase installs pgcrypto into the `extensions` schema, not `public`,
-- so functions pinned to search_path=public can't see crypt()/gen_salt().
-- Re-create the two functions that call them with the schema included.
-- =====================================================================

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

grant execute on function register_user(text, text, text) to anon;
grant execute on function login_user(text, text) to anon;
