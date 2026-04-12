
-- Create gift_vouchers table
CREATE TABLE public.gift_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  amount bigint NOT NULL,
  balance bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  buyer_name text NOT NULL,
  buyer_email text,
  buyer_phone text,
  recipient_name text NOT NULL,
  recipient_email text,
  recipient_phone text,
  personal_message text,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_approved boolean NOT NULL DEFAULT false,
  payment_approved_by uuid,
  payment_approved_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create voucher_redemptions table
CREATE TABLE public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL REFERENCES public.gift_vouchers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_used bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS for gift_vouchers
CREATE POLICY "Anyone can purchase vouchers"
  ON public.gift_vouchers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin/staff can view all vouchers"
  ON public.gift_vouchers FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Admin/staff can update vouchers"
  ON public.gift_vouchers FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Anon can insert vouchers"
  ON public.gift_vouchers FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view own voucher by code"
  ON public.gift_vouchers FOR SELECT TO anon
  USING (true);

-- RLS for voucher_redemptions
CREATE POLICY "Admin/staff can manage redemptions"
  ON public.voucher_redemptions FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Anyone can insert redemptions"
  ON public.voucher_redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can insert redemptions"
  ON public.voucher_redemptions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Admin/staff can view redemptions"
  ON public.voucher_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Function to generate unique voucher code
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gift_vouchers WHERE code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$;

-- Trigger to auto-generate voucher code on insert
CREATE OR REPLACE FUNCTION public.set_voucher_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_voucher_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_voucher_code_trigger
  BEFORE INSERT ON public.gift_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_voucher_code();

-- Trigger for updated_at
CREATE TRIGGER update_gift_vouchers_updated_at
  BEFORE UPDATE ON public.gift_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate voucher code (public, used at checkout)
CREATE OR REPLACE FUNCTION public.validate_voucher(voucher_code text)
RETURNS TABLE(id uuid, code text, balance bigint, expires_at timestamptz, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gv.id, gv.code, gv.balance, gv.expires_at, gv.status
  FROM public.gift_vouchers gv
  WHERE gv.code = upper(voucher_code)
    AND gv.status = 'active'
    AND gv.balance > 0
    AND gv.expires_at > now()
    AND gv.payment_approved = true
  LIMIT 1;
$$;
