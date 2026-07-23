-- Harden Olivia/B2B access in the shared RealtyFlow Supabase project.
-- Keeps public product reads and public quote submissions, while restricting
-- farm operations and customer data to the right authenticated profile.

CREATE SCHEMA IF NOT EXISTS olivia_private;
GRANT USAGE ON SCHEMA olivia_private TO anon, authenticated, service_role;

ALTER TABLE olivia.user_profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE olivia.user_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE olivia.user_profiles ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE olivia.user_profiles ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE olivia.user_profiles ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE olivia.user_profiles ALTER COLUMN role SET DEFAULT 'b2b_customer';
ALTER TABLE olivia.user_profiles DROP CONSTRAINT IF EXISTS olivia_user_profiles_role_check;
ALTER TABLE olivia.user_profiles
  ADD CONSTRAINT olivia_user_profiles_role_check
  CHECK (role IN ('farmer', 'super_admin', 'b2b_customer'));

CREATE OR REPLACE FUNCTION olivia.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS olivia.commerce_messages (
  id          text PRIMARY KEY,
  customer_id text REFERENCES olivia.commerce_customers(id) ON DELETE SET NULL,
  profile_id  uuid REFERENCES olivia.user_profiles(id) ON DELETE SET NULL,
  subject     text NOT NULL,
  body        text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'new',
  direction   text NOT NULL DEFAULT 'customer_to_admin',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS olivia.commerce_shipments (
  id              text PRIMARY KEY,
  order_id        text REFERENCES olivia.commerce_orders(id) ON DELETE SET NULL,
  customer_id     text REFERENCES olivia.commerce_customers(id) ON DELETE SET NULL,
  carrier         text,
  tracking_number text,
  tracking_url    text,
  status          text NOT NULL DEFAULT 'pending',
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS olivia_user_profiles_email_idx ON olivia.user_profiles(email);
CREATE INDEX IF NOT EXISTS commerce_customers_profile_id_idx ON olivia.commerce_customers(profile_id);
CREATE INDEX IF NOT EXISTS commerce_orders_customer_id_idx ON olivia.commerce_orders(customer_id);
CREATE INDEX IF NOT EXISTS commerce_order_items_order_id_idx ON olivia.commerce_order_items(order_id);
CREATE INDEX IF NOT EXISTS commerce_order_items_product_id_idx ON olivia.commerce_order_items(product_id);
CREATE INDEX IF NOT EXISTS commerce_order_items_batch_id_idx ON olivia.commerce_order_items(batch_id);
CREATE INDEX IF NOT EXISTS commerce_invoices_order_id_idx ON olivia.commerce_invoices(order_id);
CREATE INDEX IF NOT EXISTS commerce_invoices_customer_id_idx ON olivia.commerce_invoices(customer_id);
CREATE INDEX IF NOT EXISTS commerce_notifications_related_order_id_idx ON olivia.commerce_notifications(related_order_id);
CREATE INDEX IF NOT EXISTS commerce_notifications_related_customer_id_idx ON olivia.commerce_notifications(related_customer_id);
CREATE INDEX IF NOT EXISTS commerce_messages_customer_id_idx ON olivia.commerce_messages(customer_id);
CREATE INDEX IF NOT EXISTS commerce_messages_profile_id_idx ON olivia.commerce_messages(profile_id);
CREATE INDEX IF NOT EXISTS commerce_shipments_order_id_idx ON olivia.commerce_shipments(order_id);
CREATE INDEX IF NOT EXISTS commerce_shipments_customer_id_idx ON olivia.commerce_shipments(customer_id);

DROP TRIGGER IF EXISTS commerce_messages_set_updated_at ON olivia.commerce_messages;
CREATE TRIGGER commerce_messages_set_updated_at
BEFORE UPDATE ON olivia.commerce_messages
FOR EACH ROW EXECUTE FUNCTION olivia.set_updated_at();

DROP TRIGGER IF EXISTS commerce_shipments_set_updated_at ON olivia.commerce_shipments;
CREATE TRIGGER commerce_shipments_set_updated_at
BEFORE UPDATE ON olivia.commerce_shipments
FOR EACH ROW EXECUTE FUNCTION olivia.set_updated_at();

CREATE OR REPLACE FUNCTION olivia_private.is_internal_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM olivia.user_profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('farmer', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION olivia_private.is_olivia_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM olivia.user_profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION olivia_private.is_current_customer(_customer_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM olivia.commerce_customers c
    WHERE c.id = _customer_id
      AND c.profile_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION olivia_private.is_current_order(_order_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM olivia.commerce_orders o
    JOIN olivia.commerce_customers c ON c.id = o.customer_id
    WHERE o.id = _order_id
      AND c.profile_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION olivia_private.customer_exists(_customer_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM olivia.commerce_customers c
    WHERE c.id = _customer_id
  );
$$;

CREATE OR REPLACE FUNCTION olivia_private.order_belongs_to_customer(_order_id text, _customer_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM olivia.commerce_orders o
    WHERE o.id = _order_id
      AND o.customer_id = _customer_id
  );
$$;

REVOKE ALL ON FUNCTION olivia_private.is_internal_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION olivia_private.is_olivia_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION olivia_private.is_current_customer(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION olivia_private.is_current_order(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION olivia_private.customer_exists(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION olivia_private.order_belongs_to_customer(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION olivia_private.is_internal_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION olivia_private.is_olivia_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION olivia_private.is_current_customer(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION olivia_private.is_current_order(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION olivia_private.customer_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION olivia_private.order_belongs_to_customer(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION olivia_private.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) = OLD.id AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Profile role cannot be changed from the client';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION olivia_private.prevent_profile_role_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON olivia.user_profiles;
CREATE TRIGGER prevent_profile_role_change
BEFORE UPDATE OF role ON olivia.user_profiles
FOR EACH ROW EXECUTE FUNCTION olivia_private.prevent_profile_role_change();

CREATE OR REPLACE FUNCTION olivia_private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_name text;
BEGIN
  profile_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'name', '')), '');

  INSERT INTO olivia.user_profiles (
    id,
    email,
    name,
    role,
    subscription,
    subscription_start,
    avatar
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(profile_name, NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Olivia User'),
    'b2b_customer',
    'trial',
    to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM-DD'),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'avatar', ''),
      'https://ui-avatars.com/api/?name=' ||
      replace(COALESCE(profile_name, NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''), 'Olivia User'), ' ', '+') ||
      '&background=22c55e&color=000&size=256'
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(olivia.user_profiles.name, ''), EXCLUDED.name),
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION olivia_private.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_olivia ON auth.users;
CREATE TRIGGER on_auth_user_created_olivia
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION olivia_private.handle_new_user();

INSERT INTO olivia.user_profiles (
  id,
  email,
  name,
  role,
  subscription,
  subscription_start,
  avatar
)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''), NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''), 'Olivia User'),
  'b2b_customer',
  'trial',
  to_char(COALESCE(u.created_at, now()), 'YYYY-MM-DD'),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'avatar', ''),
    'https://ui-avatars.com/api/?name=' ||
    replace(COALESCE(NULLIF(trim(COALESCE(u.raw_user_meta_data->>'name', '')), ''), NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''), 'Olivia User'), ' ', '+') ||
    '&background=22c55e&color=000&size=256'
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM olivia.user_profiles p
  WHERE p.id = u.id
);

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'olivia'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'olivia'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
  END LOOP;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA olivia FROM anon, authenticated;
GRANT USAGE ON SCHEMA olivia TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA olivia TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA olivia TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA olivia TO authenticated, service_role;

GRANT SELECT (
  sku,
  name,
  description,
  category,
  size,
  channel,
  harvest_year,
  price_retail,
  price_b2b,
  unit_price,
  stock,
  stock_quantity,
  unit,
  image_url,
  status,
  active,
  public_story,
  metadata,
  created_at
) ON olivia.commerce_products TO anon;
GRANT INSERT ON olivia.commerce_customers TO anon;
GRANT INSERT ON olivia.commerce_orders TO anon;
GRANT INSERT ON olivia.commerce_notifications TO anon;

CREATE POLICY olivia_profiles_select_own
ON olivia.user_profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY olivia_profiles_insert_own
ON olivia.user_profiles
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = id AND role = 'b2b_customer');

CREATE POLICY olivia_profiles_update_own
ON olivia.user_profiles
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY olivia_profiles_admin_all
ON olivia.user_profiles
FOR ALL
TO authenticated
USING (olivia_private.is_olivia_admin())
WITH CHECK (olivia_private.is_olivia_admin());

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'olivia'
      AND c.relkind = 'r'
      AND c.relname <> 'user_profiles'
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL TO authenticated USING (olivia_private.is_internal_user()) WITH CHECK (olivia_private.is_internal_user())',
      'olivia_internal_all_' || r.table_name,
      r.schema_name,
      r.table_name
    );
  END LOOP;
END;
$$;

CREATE POLICY olivia_products_public_read
ON olivia.commerce_products
FOR SELECT
TO anon, authenticated
USING (
  active IS TRUE
  AND lower(COALESCE(status, '')) NOT IN ('draft', 'archived', 'arkivert', 'utkast')
);

CREATE POLICY olivia_customers_owner_select
ON olivia.commerce_customers
FOR SELECT
TO authenticated
USING (olivia_private.is_current_customer(id));

CREATE POLICY olivia_customers_owner_insert
ON olivia.commerce_customers
FOR INSERT
TO authenticated
WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY olivia_customers_owner_update
ON olivia.commerce_customers
FOR UPDATE
TO authenticated
USING (olivia_private.is_current_customer(id))
WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE POLICY olivia_customers_public_quote_insert
ON olivia.commerce_customers
FOR INSERT
TO anon
WITH CHECK (
  profile_id IS NULL
  AND status IN ('lead', 'new')
  AND customer_type IN ('b2b', 'b2b_customer', 'retail')
);

CREATE POLICY olivia_orders_owner_select
ON olivia.commerce_orders
FOR SELECT
TO authenticated
USING (olivia_private.is_current_customer(customer_id));

CREATE POLICY olivia_orders_owner_insert
ON olivia.commerce_orders
FOR INSERT
TO authenticated
WITH CHECK (olivia_private.is_current_customer(customer_id));

CREATE POLICY olivia_orders_public_quote_insert
ON olivia.commerce_orders
FOR INSERT
TO anon
WITH CHECK (
  order_type = 'quote'
  AND status IN ('Tilbud', 'quote', 'new')
  AND payment_status IN ('pending', 'Avventer')
  AND customer_id IS NOT NULL
  AND olivia_private.customer_exists(customer_id)
);

CREATE POLICY olivia_order_items_owner_select
ON olivia.commerce_order_items
FOR SELECT
TO authenticated
USING (olivia_private.is_current_order(order_id));

CREATE POLICY olivia_order_items_owner_insert
ON olivia.commerce_order_items
FOR INSERT
TO authenticated
WITH CHECK (olivia_private.is_current_order(order_id));

CREATE POLICY olivia_invoices_owner_select
ON olivia.commerce_invoices
FOR SELECT
TO authenticated
USING (olivia_private.is_current_customer(customer_id));

CREATE POLICY olivia_shipments_owner_select
ON olivia.commerce_shipments
FOR SELECT
TO authenticated
USING (olivia_private.is_current_customer(customer_id));

CREATE POLICY olivia_messages_owner_select
ON olivia.commerce_messages
FOR SELECT
TO authenticated
USING (
  profile_id = (SELECT auth.uid())
  OR olivia_private.is_current_customer(customer_id)
);

CREATE POLICY olivia_messages_owner_insert
ON olivia.commerce_messages
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = (SELECT auth.uid())
  AND olivia_private.is_current_customer(customer_id)
);

CREATE POLICY olivia_notifications_public_quote_insert
ON olivia.commerce_notifications
FOR INSERT
TO anon
WITH CHECK (
  event_type = 'quote_created'
  AND status = 'new'
  AND related_order_id IS NOT NULL
  AND related_customer_id IS NOT NULL
  AND olivia_private.order_belongs_to_customer(related_order_id, related_customer_id)
);

NOTIFY pgrst, 'reload schema';
