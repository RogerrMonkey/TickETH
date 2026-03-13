-- ──────────────────────────────────────────────────────────────
--  Migration 004: Security Fixes
--  Fixes Supabase linter findings:
--    - 4x security_definer_view (ERROR)
--    - 5x function_search_path_mutable (WARN)
-- ──────────────────────────────────────────────────────────────


-- ──────────────────────────────────────────────────────────────
--  1. Fix SECURITY DEFINER Views
--  Set security_invoker = true so views respect the calling
--  user's RLS policies instead of bypassing them as the owner.
-- ──────────────────────────────────────────────────────────────

ALTER VIEW event_stats SET (security_invoker = true);
ALTER VIEW tier_availability SET (security_invoker = true);
ALTER VIEW active_listings SET (security_invoker = true);
ALTER VIEW marketplace_stats SET (security_invoker = true);


-- ──────────────────────────────────────────────────────────────
--  2. Fix Function search_path Mutable
--  Pin search_path to empty string so functions only resolve
--  fully-qualified references, preventing search_path injection.
-- ──────────────────────────────────────────────────────────────

ALTER FUNCTION update_updated_at_column() SET search_path = '';
ALTER FUNCTION prevent_audit_update() SET search_path = '';
ALTER FUNCTION auth_wallet() SET search_path = '';
ALTER FUNCTION auth_role() SET search_path = '';
ALTER FUNCTION is_admin() SET search_path = '';


-- ──────────────────────────────────────────────────────────────
--  Done! Migration 004 complete.
-- ──────────────────────────────────────────────────────────────
