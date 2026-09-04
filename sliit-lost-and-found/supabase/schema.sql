-- =====================================================================
-- SLIIT Lost & Found — Database Schema
-- Run this whole file in the Supabase SQL Editor (SQL Editor > New query)
--
-- For an existing project that already ran an older version of this
-- file, use supabase/migration_002_secure_roles_and_dates.sql instead —
-- it upgrades an existing database in place without touching your data.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'student',
  password_hash text not null
);

create table if not exists lost_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  date date not null,
  location text not null,
  image_url text,
  status text not null default 'open',
  user_id uuid references users(id) on delete set null,
  constraint lost_items_date_not_future check (date <= current_date)
);

create table if not exists found_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  date date not null,
  location text not null,
  image_url text,
  status text not null default 'open',
  user_id uuid references users(id) on delete set null,
  constraint found_items_date_not_future check (date <= current_date)
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  found_item_id uuid references found_items(id) on delete cascade,
  claimant_id uuid references users(id) on delete set null,
  verification_info text not null,
  status text not null default 'pending',
  created_at timestamp not null default now()
);

-- Session tokens issued by login_user()/register_user(), consumed by
-- the admin RPCs below. Never queried directly by the client.
create table if not exists sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table users enable row level security;
alter table lost_items enable row level security;
alter table found_items enable row level security;
alter table claims enable row level security;
alter table sessions enable row level security;

-- Items: open read/write policies. This is a class project with no
-- separate backend — the browser talks to Postgres directly with the
-- public anon key, so anyone with that key could in principle write
-- item rows directly. Role changes and claim decisions are NOT left
-- this open (see the RPCs below), because those are the actions that
-- actually need real authorization.
drop policy if exists "public read lost_items" on lost_items;
create policy "public read lost_items" on lost_items for select using (true);
drop policy if exists "public insert lost_items" on lost_items;
create policy "public insert lost_items" on lost_items for insert with check (true);
drop policy if exists "public update lost_items" on lost_items;
create policy "public update lost_items" on lost_items for update using (true);
drop policy if exists "public delete lost_items" on lost_items;
create policy "public delete lost_items" on lost_items for delete using (true);

drop policy if exists "public read found_items" on found_items;
create policy "public read found_items" on found_items for select using (true);
drop policy if exists "public insert found_items" on found_items;
create policy "public insert found_items" on found_items for insert with check (true);
drop policy if exists "public update found_items" on found_items;
create policy "public update found_items" on found_items for update using (true);
drop policy if exists "public delete found_items" on found_items;
create policy "public delete found_items" on found_items for delete using (true);

drop policy if exists "public read claims" on claims;
create policy "public read claims" on claims for select using (true);
drop policy if exists "public insert claims" on claims;
create policy "public insert claims" on claims for insert with check (true);
drop policy if exists "public delete claims" on claims;
create policy "public delete claims" on claims for delete using (true);
-- Note: no public UPDATE policy on claims — status changes only happen
-- through admin_decide_claim(), which checks the caller is an admin.

-- users/sessions: no RLS policies granting the anon role access at all.
-- Every read/write the app needs goes through the RPCs below (register,
-- login, current_session_user, admin_promote_user, admin_decide_claim),
-- which run as SECURITY DEFINER and check authorization themselves.
-- The one exception is a narrow, column-restricted SELECT grant so the
-- app can still show names/roles (never password_hash) in the UI.
revoke select on users from anon;
grant select (id, name, email, role) on users to anon;
revoke insert on users from anon;
revoke update on users from anon;
revoke all on sessions from anon;

-- ---------------------------------------------------------------------
-- Auth + admin RPCs
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

  -- Role is always 'student' here, on purpose: there is no p_role
  -- parameter, so a client can never register itself as an admin.
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

-- =====================================================================
-- Sample data (SLIIT-relevant, ~10 rows per table)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Users — demo passwords: students "student123", admin "admin12345"
-- (hashed on insert, never stored as plain text)
-- ---------------------------------------------------------------------
insert into users (id, name, email, role, password_hash) values
  ('11111111-1111-1111-1111-111111111101', 'Nimal Perera',      'nimal.perera@my.sliit.lk',      'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111102', 'Kavindi Silva',     'kavindi.silva@my.sliit.lk',     'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111103', 'Tharindu Fernando', 'tharindu.fernando@my.sliit.lk', 'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111104', 'Ishara Jayasuriya', 'ishara.jayasuriya@my.sliit.lk', 'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111105', 'Dulanjali Kumari',  'dulanjali.kumari@my.sliit.lk',  'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111106', 'Ravindu Wickrama',  'ravindu.wickrama@my.sliit.lk',  'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111107', 'Sanduni Rathnayake','sanduni.rathnayake@my.sliit.lk','student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111108', 'Chamath Gunasekara','chamath.gunasekara@my.sliit.lk','student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111109', 'Ayesha Bandara',    'ayesha.bandara@my.sliit.lk',    'student', crypt('student123', gen_salt('bf'))),
  ('11111111-1111-1111-1111-111111111110', 'Admin Office',      'admin@gmail.com',               'admin',   crypt('admin12345', gen_salt('bf')))
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Lost items
-- ---------------------------------------------------------------------
insert into lost_items (id, name, category, description, date, location, image_url, status, user_id) values
  ('22222222-2222-2222-2222-222222222201', 'Student ID Card', 'ID Card', 'SLIIT ID card, name Nimal Perera, IT year 3.', '2026-08-25', 'Faculty of Computing', null, 'open',    '11111111-1111-1111-1111-111111111101'),
  ('22222222-2222-2222-2222-222222222202', 'Black Wallet', 'Wallet', 'Leather wallet with student ID and some cash.', '2026-08-27', 'Cafeteria', null, 'open',    '11111111-1111-1111-1111-111111111102'),
  ('22222222-2222-2222-2222-222222222203', 'Dell Laptop', 'Electronics', 'Dell Inspiron 15, black, has a QSE sticker on the lid.', '2026-08-28', 'Library', null, 'open',    '11111111-1111-1111-1111-111111111103'),
  ('22222222-2222-2222-2222-222222222204', 'Blue Water Bottle', 'Water Bottle', 'Steel bottle with a SLIIT FOSS club sticker.', '2026-08-29', 'Auditorium', null, 'open',    '11111111-1111-1111-1111-111111111104'),
  ('22222222-2222-2222-2222-222222222205', 'Grey Backpack', 'Bag', 'Contains lecture notes and a calculator.', '2026-08-30', 'Faculty of Computing', null, 'open',    '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222222206', 'Wired Earphones', 'Electronics', 'JBL earphones, white, in a small pouch.', '2026-08-31', 'Cafeteria', null, 'open',    '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222222207', 'Umbrella', 'Umbrella', 'Black and red foldable umbrella.', '2026-09-01', 'Library', null, 'open',    '11111111-1111-1111-1111-111111111107'),
  ('22222222-2222-2222-2222-222222222208', 'Scientific Calculator', 'Electronics', 'Casio fx-991ES with name tag on the back.', '2026-09-01', 'Faculty of Computing', null, 'matched', '11111111-1111-1111-1111-111111111108'),
  ('22222222-2222-2222-2222-222222222209', 'Spectacles Case', 'Accessory', 'Brown leather case, empty when lost.', '2026-09-02', 'Sports Complex', null, 'open',    '11111111-1111-1111-1111-111111111109'),
  ('22222222-2222-2222-2222-222222222210', 'Silver Wristwatch', 'Accessory', 'Casio silver watch, small scratch on strap.', '2026-09-02', 'Cafeteria', null, 'returned', '11111111-1111-1111-1111-111111111101')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Found items
-- ---------------------------------------------------------------------
insert into found_items (id, name, category, description, date, location, image_url, status, user_id) values
  ('33333333-3333-3333-3333-333333333301', 'ID Card Found', 'ID Card', 'Found a SLIIT ID card near the entrance, name starts with N.', '2026-08-25', 'Faculty of Computing', null, 'open',    '11111111-1111-1111-1111-111111111102'),
  ('33333333-3333-3333-3333-333333333302', 'Black Wallet Found', 'Wallet', 'Found near the cafeteria tables, has cards inside.', '2026-08-27', 'Cafeteria', null, 'open',    '11111111-1111-1111-1111-111111111103'),
  ('33333333-3333-3333-3333-333333333303', 'Laptop Found', 'Electronics', 'Black Dell laptop left on a library desk.', '2026-08-28', 'Library', null, 'open',    '11111111-1111-1111-1111-111111111104'),
  ('33333333-3333-3333-3333-333333333304', 'Steel Bottle', 'Water Bottle', 'Blue steel bottle with a sticker, found after a seminar.', '2026-08-30', 'Auditorium', null, 'open',    '11111111-1111-1111-1111-111111111105'),
  ('33333333-3333-3333-3333-333333333305', 'Grey Bag', 'Bag', 'Backpack with notebooks, left near the stairs.', '2026-08-31', 'Faculty of Computing', null, 'open',    '11111111-1111-1111-1111-111111111106'),
  ('33333333-3333-3333-3333-333333333306', 'White Earphones', 'Electronics', 'Found on a cafeteria table, JBL branded.', '2026-08-31', 'Cafeteria', null, 'open',    '11111111-1111-1111-1111-111111111107'),
  ('33333333-3333-3333-3333-333333333307', 'Calculator Found', 'Electronics', 'Casio calculator with a name tag, found in a lecture hall.', '2026-09-01', 'Faculty of Computing', null, 'claimed', '11111111-1111-1111-1111-111111111108'),
  ('33333333-3333-3333-3333-333333333308', 'Foldable Umbrella', 'Umbrella', 'Black/red umbrella left near the library entrance.', '2026-09-01', 'Library', null, 'open',    '11111111-1111-1111-1111-111111111109'),
  ('33333333-3333-3333-3333-333333333309', 'Wristwatch', 'Accessory', 'Silver Casio watch found at the cafeteria.', '2026-09-02', 'Cafeteria', null, 'returned', '11111111-1111-1111-1111-111111111101'),
  ('33333333-3333-3333-3333-333333333310', 'Spectacles Case', 'Accessory', 'Brown leather case found near Sports Complex entrance.', '2026-09-03', 'Sports Complex', null, 'open',    '11111111-1111-1111-1111-111111111102')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Claims
-- ---------------------------------------------------------------------
insert into claims (id, found_item_id, claimant_id, verification_info, status, created_at) values
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111108', 'My name tag is on the back of the calculator, it says C. Gunasekara.', 'approved', now() - interval '2 days'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111101', 'The watch has a small scratch on the strap near the buckle.', 'approved', now() - interval '1 day'),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'That is my ID card, student number and photo match, I can show my NIC.', 'pending',  now() - interval '3 hours'),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111102', 'Wallet has my SLIIT ID and a bus pass with my photo.', 'pending', now() - interval '5 hours'),
  ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111103', 'Laptop has a QSE sticker on the lid and my name in the boot screen.', 'pending', now() - interval '1 hours'),
  ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111106', 'These are my JBL earphones, the pouch has my initials on it.', 'rejected', now() - interval '6 hours')
on conflict (id) do nothing;
