
-- ============================================================
-- ISSUE 1 & 2: Recreate RLS policies with (select auth.uid())
-- and consolidate multiple permissive policies
-- ============================================================

-- business_settings
DROP POLICY IF EXISTS "Admin can manage business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Deny public select on business_settings" ON public.business_settings;
CREATE POLICY "Admin can manage business settings" ON public.business_settings
  FOR ALL TO public USING (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Deny public select on business_settings" ON public.business_settings
  AS RESTRICTIVE FOR SELECT TO public USING (has_role((select auth.uid()), 'admin'::app_role));

-- cart_items
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view own cart" ON public.cart_items;
CREATE POLICY "Users can view own cart" ON public.cart_items FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own cart" ON public.cart_items FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own cart items" ON public.cart_items FOR DELETE USING ((select auth.uid()) = user_id);

-- categories
DROP POLICY IF EXISTS "Admin/staff can manage categories" ON public.categories;
CREATE POLICY "Admin/staff can manage categories" ON public.categories FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- contact_submissions
DROP POLICY IF EXISTS "Admin can manage submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admin/staff can view submissions" ON public.contact_submissions;
CREATE POLICY "Admin can manage submissions" ON public.contact_submissions FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admin/staff can view submissions" ON public.contact_submissions FOR SELECT
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- contacts
DROP POLICY IF EXISTS "Admin/staff can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin/staff can view contacts" ON public.contacts;
CREATE POLICY "Admin/staff can manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can view contacts" ON public.contacts FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- creative_assets
DROP POLICY IF EXISTS "Admin/staff can delete creative assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Admin/staff can insert creative assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Admin/staff can update creative assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Admin/staff can view creative assets" ON public.creative_assets;
CREATE POLICY "Admin/staff can view creative assets" ON public.creative_assets FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can insert creative assets" ON public.creative_assets FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can update creative assets" ON public.creative_assets FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can delete creative assets" ON public.creative_assets FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- creative_performance
DROP POLICY IF EXISTS "Admin/staff can delete creative performance" ON public.creative_performance;
DROP POLICY IF EXISTS "Admin/staff can insert creative performance" ON public.creative_performance;
DROP POLICY IF EXISTS "Admin/staff can update creative performance" ON public.creative_performance;
DROP POLICY IF EXISTS "Admin/staff can view creative performance" ON public.creative_performance;
CREATE POLICY "Admin/staff can view creative performance" ON public.creative_performance FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can insert creative performance" ON public.creative_performance FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can update creative performance" ON public.creative_performance FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can delete creative performance" ON public.creative_performance FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- credit_payments (consolidate ALL+SELECT → ALL only)
DROP POLICY IF EXISTS "Admin/staff can manage credit payments" ON public.credit_payments;
DROP POLICY IF EXISTS "Admin/staff can view credit payments" ON public.credit_payments;
CREATE POLICY "Admin/staff can manage credit payments" ON public.credit_payments FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- expenses (consolidate)
DROP POLICY IF EXISTS "Admin can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin can view expenses" ON public.expenses;
CREATE POLICY "Admin can manage expenses" ON public.expenses FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- gift_vouchers
DROP POLICY IF EXISTS "Admin/staff can update vouchers" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Admin/staff can view all vouchers" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Anyone can purchase vouchers" ON public.gift_vouchers;
CREATE POLICY "Admin/staff can view all vouchers" ON public.gift_vouchers FOR SELECT
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can update vouchers" ON public.gift_vouchers FOR UPDATE
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Anyone can purchase vouchers" ON public.gift_vouchers FOR INSERT TO anon, authenticated
  WITH CHECK ((status = 'pending'::text) AND (payment_approved = false) AND (payment_status = 'unpaid'::text) AND (balance = 0) AND (payment_approved_by IS NULL) AND (payment_approved_at IS NULL));

-- invoice_audit_log
DROP POLICY IF EXISTS "Admin/staff can insert audit log" ON public.invoice_audit_log;
DROP POLICY IF EXISTS "Admin/staff can view audit log" ON public.invoice_audit_log;
CREATE POLICY "Admin/staff can view audit log" ON public.invoice_audit_log FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Admin/staff can insert audit log" ON public.invoice_audit_log FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- invoice_items
DROP POLICY IF EXISTS "Admin/staff can manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Customers can view own invoice items" ON public.invoice_items;
CREATE POLICY "Admin/staff can manage invoice items" ON public.invoice_items FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Customers can view own invoice items" ON public.invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.customer_id = (select auth.uid())));

-- invoices
DROP POLICY IF EXISTS "Admin/staff can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
CREATE POLICY "Admin/staff can manage invoices" ON public.invoices FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Customers can view own invoices" ON public.invoices FOR SELECT
  USING ((select auth.uid()) = customer_id);

-- loyalty_points_log
DROP POLICY IF EXISTS "Admin/staff can manage loyalty points" ON public.loyalty_points_log;
DROP POLICY IF EXISTS "Admin/staff can view all loyalty points" ON public.loyalty_points_log;
DROP POLICY IF EXISTS "Customers can view own loyalty points" ON public.loyalty_points_log;
CREATE POLICY "Admin/staff can manage loyalty points" ON public.loyalty_points_log FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Customers can view own loyalty points" ON public.loyalty_points_log FOR SELECT
  USING ((select auth.uid()) = customer_id OR has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- newsletter_subscribers
DROP POLICY IF EXISTS "Admin can manage subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admin can view subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Admin can manage subscribers" ON public.newsletter_subscribers FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

-- order_items
DROP POLICY IF EXISTS "Admin/staff can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can insert items into own orders" ON public.order_items;
DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Admin/staff can manage order items" ON public.order_items FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Authenticated users can insert items into own orders" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.customer_id = (select auth.uid())));
CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = (select auth.uid())));

-- orders
DROP POLICY IF EXISTS "Admin/staff can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admin/staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated customers can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Admin/staff can manage orders" ON public.orders FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Authenticated customers can create own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT
  USING ((select auth.uid()) = customer_id);

-- product_stock
DROP POLICY IF EXISTS "Admin/staff can manage product stock" ON public.product_stock;
DROP POLICY IF EXISTS "Admin/staff can view product stock" ON public.product_stock;
CREATE POLICY "Admin/staff can manage product stock" ON public.product_stock FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- product_variants
DROP POLICY IF EXISTS "Admin/staff can manage variants" ON public.product_variants;
CREATE POLICY "Admin/staff can manage variants" ON public.product_variants FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- products
DROP POLICY IF EXISTS "Admin/staff can manage products" ON public.products;
CREATE POLICY "Admin/staff can manage products" ON public.products FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- profiles
DROP POLICY IF EXISTS "Admin/staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- purchase_order_items
DROP POLICY IF EXISTS "Admin can manage PO items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admin can view PO items" ON public.purchase_order_items;
CREATE POLICY "Admin can manage PO items" ON public.purchase_order_items FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- purchase_orders
DROP POLICY IF EXISTS "Admin can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin can view purchase orders" ON public.purchase_orders;
CREATE POLICY "Admin can manage purchase orders" ON public.purchase_orders FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- reviews
DROP POLICY IF EXISTS "Admin/staff can manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Admin/staff can manage reviews" ON public.reviews FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- stock_locations
DROP POLICY IF EXISTS "Admin can manage locations" ON public.stock_locations;
DROP POLICY IF EXISTS "Admin/staff can view locations" ON public.stock_locations;
CREATE POLICY "Admin can manage locations" ON public.stock_locations FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admin/staff can view locations" ON public.stock_locations FOR SELECT
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- stock_movements
DROP POLICY IF EXISTS "Admin/staff can manage stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admin/staff can view stock movements" ON public.stock_movements;
CREATE POLICY "Admin/staff can manage stock movements" ON public.stock_movements FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- suppliers
DROP POLICY IF EXISTS "Admin can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin can view suppliers" ON public.suppliers;
CREATE POLICY "Admin can manage suppliers" ON public.suppliers FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- user_roles (consolidate SELECT)
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "View roles" ON public.user_roles FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- variant_stock (consolidate ALL+SELECT)
DROP POLICY IF EXISTS "Admin/staff can manage variant stock" ON public.variant_stock;
DROP POLICY IF EXISTS "Admin/staff can view variant stock" ON public.variant_stock;
CREATE POLICY "Admin/staff can manage variant stock" ON public.variant_stock FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- voucher_redemptions (consolidate)
DROP POLICY IF EXISTS "Admin/staff can manage redemptions" ON public.voucher_redemptions;
DROP POLICY IF EXISTS "Admin/staff can view redemptions" ON public.voucher_redemptions;
CREATE POLICY "Admin/staff can manage redemptions" ON public.voucher_redemptions FOR ALL
  USING (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'staff'::app_role));

-- website_content (split admin ALL into separate write commands so SELECT public is the only SELECT policy)
DROP POLICY IF EXISTS "Admin can manage website content" ON public.website_content;
DROP POLICY IF EXISTS "Anyone can view website content" ON public.website_content;
CREATE POLICY "Anyone can view website content" ON public.website_content FOR SELECT USING (true);
CREATE POLICY "Admin can insert website content" ON public.website_content FOR INSERT TO authenticated
  WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admin can update website content" ON public.website_content FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role)) WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));
CREATE POLICY "Admin can delete website content" ON public.website_content FOR DELETE TO authenticated
  USING (has_role((select auth.uid()), 'admin'::app_role));

-- wishlist_items
DROP POLICY IF EXISTS "Users can delete own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlist_items;
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlist_items;
CREATE POLICY "Users can view own wishlist" ON public.wishlist_items FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can manage own wishlist" ON public.wishlist_items FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own wishlist items" ON public.wishlist_items FOR DELETE
  USING ((select auth.uid()) = user_id);

-- products: "Anyone can view active products" (no auth.uid() — leave as is)
-- categories "Anyone can view categories", product_variants "Anyone can view variants",
-- reviews "Anyone can view approved reviews" — no auth.uid(), unchanged.

-- ============================================================
-- ISSUE 3: Drop duplicate index on variant_stock
-- ============================================================
DROP INDEX IF EXISTS public.variant_stock_variant_location_unique;

-- ============================================================
-- ISSUE 4: Add covering indexes on FK columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON public.cart_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_credit_payments_order ON public.credit_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_received_by ON public.credit_payments(received_by);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_log_order ON public.loyalty_points_log(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant ON public.order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_product_stock_location ON public.product_stock(location_id);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product ON public.purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_variant ON public.purchase_order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON public.stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON public.stock_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by ON public.stock_movements(performed_by);
