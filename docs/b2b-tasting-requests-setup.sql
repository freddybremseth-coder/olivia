-- Applied to RealtyflowPRO / olivia on 2026-11-10 after owner approval.
-- Kept here as a reproducible schema reference. Public clients may INSERT,
-- while only an authenticated Olivia super-admin may SELECT via existing role check.
CREATE TABLE IF NOT EXISTS olivia.b2b_tasting_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL CHECK (length(trim(company)) BETWEEN 1 AND 180),
  contact_role text,
  email text NOT NULL CHECK (length(trim(email)) BETWEEN 5 AND 254 AND position('@' in email) > 1),
  delivery_address text,
  locale text NOT NULL DEFAULT 'no',
  source text NOT NULL DEFAULT 'public_b2b_landing_page',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','qualified','contacted','closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE olivia.b2b_tasting_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON olivia.b2b_tasting_requests FROM anon, authenticated;
GRANT INSERT ON olivia.b2b_tasting_requests TO anon, authenticated;

DROP POLICY IF EXISTS olivia_public_b2b_request_insert ON olivia.b2b_tasting_requests;
CREATE POLICY olivia_public_b2b_request_insert
  ON olivia.b2b_tasting_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    source = 'public_b2b_landing_page'
    AND status = 'new'
    AND length(coalesce(notes, '')) <= 4000
    AND length(coalesce(delivery_address, '')) <= 300
    AND length(coalesce(contact_role, '')) <= 120
  );

GRANT SELECT ON olivia.b2b_tasting_requests TO authenticated;
DROP POLICY IF EXISTS olivia_admin_b2b_requests_read ON olivia.b2b_tasting_requests;
CREATE POLICY olivia_admin_b2b_requests_read
  ON olivia.b2b_tasting_requests
  FOR SELECT TO authenticated
  USING (olivia_private.is_olivia_admin());

GRANT UPDATE (status, updated_at) ON olivia.b2b_tasting_requests TO authenticated;
DROP POLICY IF EXISTS olivia_admin_b2b_requests_update ON olivia.b2b_tasting_requests;
CREATE POLICY olivia_admin_b2b_requests_update
  ON olivia.b2b_tasting_requests
  FOR UPDATE TO authenticated
  USING (olivia_private.is_olivia_admin())
  WITH CHECK (olivia_private.is_olivia_admin());
