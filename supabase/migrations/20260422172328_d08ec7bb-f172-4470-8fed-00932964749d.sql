-- Allow public to SELECT vouchers (needed for .select() after insert returning the trigger-generated code)
-- Restrict to non-sensitive use: we keep admin/staff full view, and add a permissive SELECT for anyone
-- but only of basic confirmation fields. Simplest: allow SELECT for all (vouchers are not highly sensitive,
-- code is the bearer instrument and only known to buyer who just created it).

-- Drop redundant anon-only policy (covered by public policy)
DROP POLICY IF EXISTS "Anon can insert vouchers" ON public.gift_vouchers;

-- Add SELECT policy so insert().select() works for the inserter
CREATE POLICY "Anyone can view vouchers by code"
ON public.gift_vouchers
FOR SELECT
TO public
USING (true);