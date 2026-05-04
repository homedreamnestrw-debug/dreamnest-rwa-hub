-- 1. Restrict cost_price column to admin/staff only
REVOKE SELECT (cost_price) ON public.products FROM anon, authenticated;
GRANT SELECT (cost_price) ON public.products TO service_role;

-- 2. Tighten user_roles policies: ensure no privilege escalation
-- Drop the overly broad ALL policy and replace with explicit per-command policies
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Lock down SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
-- where they should not be publicly callable. Keep public ones (validate_voucher,
-- get_public_business_settings, get_public_website_content, create_guest_order, has_role).

REVOKE EXECUTE ON FUNCTION public.approve_order_payment(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_order_payment(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_stock(uuid, uuid, uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_variant_stock(uuid, uuid, uuid, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_variant_stock(uuid, uuid, integer, stock_movement_type, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_voucher(text, uuid, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM anon, authenticated;

-- These need authenticated access (still gated by internal role checks)
GRANT EXECUTE ON FUNCTION public.approve_order_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_order_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_stock(uuid, uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_variant_stock(uuid, uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_variant_stock(uuid, uuid, integer, stock_movement_type, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_voucher(text, uuid, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;