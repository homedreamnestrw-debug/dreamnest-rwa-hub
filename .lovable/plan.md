

## Plan: Add "Shop Enabled" Toggle in Settings

### What
Add a switch in the admin Settings page (Business tab) that lets you disable the public shopping experience. When off, visitors see a "Coming Soon" message instead of the shop, product pages, and cart.

### How

**1. Database migration** — Add `shop_enabled` column to `business_settings`:
```sql
ALTER TABLE public.business_settings
  ADD COLUMN shop_enabled boolean NOT NULL DEFAULT true;
```

Update `get_public_business_settings()` function to include `shop_enabled` in its return type and SELECT.

**2. Settings page** (`src/pages/admin/Settings.tsx`) — Add a Switch toggle in the Business tab:
- Label: "Enable Online Shopping"
- Description: "Turn off to show a 'Coming Soon' page to visitors"
- Wired to `form.shop_enabled`

**3. Public layout gate** — Create a hook or query that checks `shop_enabled` from `get_public_business_settings()`. In the pages that should be blocked when shopping is off (`Shop`, `ProductDetail`, `Cart`, `Checkout`, `GiftVouchers`), redirect to a "Coming Soon" view or show a branded placeholder message. The `Home` page can remain visible but hide "Shop Now" CTAs and product sections.

**4. Coming Soon page** — A simple branded page within `PublicLayout` showing:
- DreamNest logo
- "We're launching soon" heading
- Brief message
- Contact info / WhatsApp link

### Files to change
- **Migration**: new SQL file for `shop_enabled` column + updated RPC
- `src/integrations/supabase/types.ts` — auto-updated
- `src/pages/admin/Settings.tsx` — add Switch toggle
- `src/pages/Shop.tsx` — check `shop_enabled`, show Coming Soon if off
- `src/pages/ProductDetail.tsx` — same guard
- `src/pages/Cart.tsx` — same guard
- `src/pages/Checkout.tsx` — same guard
- `src/pages/Home.tsx` — conditionally hide shop CTAs
- `src/components/layout/Header.tsx` — optionally hide "Shop" nav link when disabled

