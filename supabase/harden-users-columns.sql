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
-- KNOWN GAP (closed by the REVOKE below): with only column SELECT granted, anon
-- could still INSERT/UPDATE/DELETE user rows directly (e.g. write a bcrypt hash
-- of its choosing or create a Management user) -> account takeover. User rows are
-- now created/updated only through auth-handler, which runs as the service role,
-- verifies the caller's app JWT, and enforces the user_role claim for Management
-- operations (see supabase/functions/auth-handler/index.ts).

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

-- Close direct writes from the public client.
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;
