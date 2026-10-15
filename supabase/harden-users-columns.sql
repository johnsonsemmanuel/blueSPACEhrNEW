-- =============================================================
-- Harden public.users column exposure (targeted fix)
-- Run in Supabase SQL Editor / via: supabase db query -f this-file --linked
-- =============================================================
--
-- Context: the client's Supabase client runs as the `anon` role (the app's own
-- JWT is only sent to edge functions, never to Postgres — see client/src/lib/
-- supabase.js). RLS is disabled on public.users, so table-level grants decide
-- exposure. Before this fix, anon could `select=password` and read bcrypt
-- hashes (HTTP 200).
--
-- This revokes table-wide SELECT and re-grants only the non-sensitive columns
-- the app actually reads. Every client query on `users` lists explicit columns
-- (never `*`), so narrowing the grant is safe. Note: `select=*` on users now
-- errors, which is intended.
--
-- KNOWN GAP (not fixed here): anon still has INSERT/UPDATE/DELETE on users and
-- other tables. That permits account takeover via a direct anon write. Closing
-- it requires either authenticating the client to Postgres or routing all
-- writes through edge functions, plus enabling RLS — deferred to an auth rework.

REVOKE SELECT ON public.users FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  email,
  type,
  avatar,
  phone,
  address,
  is_active,
  force_password_change,
  last_login_at,
  created_at,
  updated_at
) ON public.users TO anon, authenticated;
