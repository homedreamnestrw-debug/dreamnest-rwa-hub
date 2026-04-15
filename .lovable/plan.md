

## Plan: Add "Shop Enabled" Toggle (Including Gift Vouchers)

### Summary
Add a `shop_enabled` boolean to `business_settings` so the admin can disable all public shopping pages — including Gift Vouchers — before the business launches. When off, visitors see a branded "Coming Soon" message.

### 1. Database Migration
- Add `shop_enabled boolean NOT NULL DEFAULT true` to `business_settings`
- Drop and recreate `get_public_business_settings()` to include `shop_enabled` in its return type

### 2. Create `useShopEnabled` Hook
A small hook that calls `get_public_business_settings` RPC and returns `{ shopEnabled, isLoading }`. Used by all gated pages.

**File**: `src/hooks/useShopEnabled.ts`

### 3. Create `ComingSoon` Component
A branded placeholder shown when shop is disabled — DreamNest logo, "We're launching soon" heading, brief message, WhatsApp/contact link.

**File**: `src/components/layout/ComingSoon.tsx`

### 4. Gate Public Shopping Pages
Add the `useShopEnabled` check at the top of these pages. If `shopEnabled === false`, render `<ComingSoon />` instead of the page content:
- `src/pages/Shop.tsx`
- `src/pages/ProductDetail.tsx`
- `src/pages/Cart.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/GiftVouchers.tsx`

### 5. Admin Settings Toggle
Add a Switch in the Business tab of `src/pages/admin/Settings.tsx`:
- Label: "Enable Online Shopping"
- Description: "Turn off to show a Coming Soon page to visitors"
- Wire to `form.shop_enabled`

### 6. Conditionally Hide Nav Links
In `src/components/layout/Header.tsx`, hide "Shop" and "Gift Vouchers" nav links when `shopEnabled` is false.

Optionally hide "Shop Now" CTAs on the Home page.

### Files to Create
- Migration SQL (1 file)
- `src/hooks/useShopEnabled.ts`
- `src/components/layout/ComingSoon.tsx`

### Files to Edit
- `src/pages/admin/Settings.tsx` — add toggle
- `src/pages/Shop.tsx` — add gate
- `src/pages/ProductDetail.tsx` — add gate
- `src/pages/Cart.tsx` — add gate
- `src/pages/Checkout.tsx` — add gate
- `src/pages/GiftVouchers.tsx` — add gate
- `src/components/layout/Header.tsx` — conditionally hide links
- `src/pages/Home.tsx` — optionally hide shop CTAs

