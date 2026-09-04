# SLIIT Lost & Found

A central place for SLIIT students to report lost belongings, list found
items, and safely claim them back — built to replace scattered WhatsApp
groups and notice boards with one searchable system.

**Stack:** React (Vite) + Tailwind CSS v4, talking directly to Supabase
(Postgres) from the browser — no separate backend server.

## 1. Set up the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor > New query** in your Supabase dashboard.
3. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql)
   and run it. This creates the `users`, `lost_items`, `found_items`,
   `claims` and `sessions` tables, the auth/admin RPC functions described
   below, and inserts ~10 sample rows per table.
   - Already have this database from an earlier version of the project?
     Run [`supabase/migration_002_secure_roles_and_dates.sql`](supabase/migration_002_secure_roles_and_dates.sql)
     instead — it upgrades your existing tables in place without touching
     your data.
4. In **Project Settings > API**, copy your **Project URL** and
   **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and fill in the two values from step 1:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open the printed local URL. If `.env` isn't set up yet, the app still
renders with a banner warning that Supabase isn't configured — data just
won't load until you add real credentials.

## How login & authorization work

There's a login page at `/login` and a sign-up page at `/register`, shared
by students and admins. Lost Items, Found Items and Claims require being
logged in; `/admin` additionally requires the `admin` role — students are
redirected away if they try to reach it directly.

Every new account created through `/register` is always a `student` —
there's no way to request admin from the sign-up form. An existing admin
can promote another user to admin from the Admin Dashboard's user table.

**Demo accounts** (from the sample data):
- **Admin** — `admin@gmail.com` / `admin12345`
- **Student** — any student email (e.g. `nimal.perera@my.sliit.lk`) /
  `student123`

**Security model.** There's still no separate backend server — the browser
talks to Supabase (Postgres) directly with the public anon key — but the
sensitive parts are enforced *inside the database*, not just in the React
UI:
- Passwords are hashed with bcrypt (`pgcrypto`'s `crypt()`), never stored
  or transmitted in plain text.
- Login/registration go through `login_user()` / `register_user()`
  Postgres functions, which verify the password hash server-side and
  return a random session token (stored in a `sessions` table).
- Promoting a user to admin and approving/rejecting a claim go through
  `admin_promote_user()` / `admin_decide_claim()` — both `SECURITY
  DEFINER` functions that look up the caller's session token, check their
  role is `admin` in the database, and reject the call otherwise. This
  holds even if someone calls the RPC directly (Postman, DevTools, curl)
  with a non-admin token — the check happens in Postgres, not in the
  client.
- The `users` table's `password_hash` column is not reachable via the
  public API at all (`revoke select ... grant select (id, name, email,
  role)`), and direct `UPDATE`s to `users`/`claims` from the anon key are
  revoked — all writes to role and claim status go through the RPCs above.
- `lost_items.date` and `found_items.date` have a `check (date <=
  current_date)` constraint, so a future date is rejected by the database
  itself even if the request bypasses the frontend entirely.

What's still out of scope for a class project: real session expiry/
rotation beyond the 7-day token TTL, rate limiting on login attempts, and
email verification on sign-up.

## Pages

- `/` — Home: hero, the problem this app solves (and who it affects), live
  stats, and a "how it works" walkthrough. Public, no login required.
- `/login` — shared login page for students and admins.
- `/register` — sign-up page; new accounts always start as a student.
- `/lost` — report, search/filter, edit and delete lost items. Requires login.
- `/found` — same, for found items.
- `/claims` — browse claimable found items, submit a claim with
  verification details, track claim status; admins approve/reject. Requires login.
- `/admin` — counts by status across all tables, plus a user list. Admin only.

## Deploying to Vercel

1. Push this project to a GitHub repository:
   ```bash
   git add -A
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sliit-lost-and-found.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import that GitHub
   repo. Vercel auto-detects the Vite framework preset — leave the build
   command (`npm run build`) and output directory (`dist`) as default.
3. Before deploying, add the two environment variables under
   **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Once it finishes, open the `*.vercel.app` link it
   gives you in an incognito window to confirm it works for a fresh
   visitor with no local storage or cache.

Alternative without GitHub — deploy straight from your machine with the
Vercel CLI:

```bash
npm install -g vercel
vercel login
vercel --prod
```

It will prompt for the same two environment variables on first deploy.
