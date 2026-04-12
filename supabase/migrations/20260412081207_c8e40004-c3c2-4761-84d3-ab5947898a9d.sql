
-- Contacts table for guest customers / leads
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  shipping_address TEXT,
  city TEXT,
  source TEXT NOT NULL DEFAULT 'online_order',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on phone (non-null)
CREATE UNIQUE INDEX idx_contacts_phone ON public.contacts (phone) WHERE phone IS NOT NULL AND phone != '';
-- Unique constraint on email (non-null)
CREATE UNIQUE INDEX idx_contacts_email ON public.contacts (email) WHERE email IS NOT NULL AND email != '';

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Admin/staff can do everything
CREATE POLICY "Admin/staff can manage contacts"
ON public.contacts FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin/staff can view contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Trigger: auto-save guest order info as contact
CREATE OR REPLACE FUNCTION public.save_guest_contact_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for guest online orders
  IF NEW.customer_id IS NULL AND (NEW.guest_phone IS NOT NULL OR NEW.guest_email IS NOT NULL) THEN
    INSERT INTO public.contacts (full_name, email, phone, shipping_address, city, source)
    VALUES (
      NEW.guest_name,
      NULLIF(NEW.guest_email, ''),
      NULLIF(NEW.guest_phone, ''),
      NEW.shipping_address,
      NEW.shipping_city,
      'online_order'
    )
    ON CONFLICT ((phone)) WHERE phone IS NOT NULL AND phone != ''
    DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, contacts.full_name),
      email = COALESCE(EXCLUDED.email, contacts.email),
      shipping_address = COALESCE(EXCLUDED.shipping_address, contacts.shipping_address),
      city = COALESCE(EXCLUDED.city, contacts.city),
      updated_at = now();
    
    -- Also try email-based upsert if phone didn't match
    IF NEW.guest_email IS NOT NULL AND NEW.guest_email != '' THEN
      INSERT INTO public.contacts (full_name, email, phone, shipping_address, city, source)
      VALUES (
        NEW.guest_name,
        NEW.guest_email,
        NULLIF(NEW.guest_phone, ''),
        NEW.shipping_address,
        NEW.shipping_city,
        'online_order'
      )
      ON CONFLICT ((email)) WHERE email IS NOT NULL AND email != ''
      DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, contacts.full_name),
        phone = COALESCE(EXCLUDED.phone, contacts.phone),
        shipping_address = COALESCE(EXCLUDED.shipping_address, contacts.shipping_address),
        city = COALESCE(EXCLUDED.city, contacts.city),
        updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER save_guest_contact_on_order_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.save_guest_contact_on_order();

-- Updated_at trigger
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
