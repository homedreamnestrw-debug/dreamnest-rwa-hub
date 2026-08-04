# Plan: Mobile UI Optimization (PWA polish)

## Problems seen on phone

- Product images inside cards are cropped/blurred and inconsistent — thumbnails are upscaled and cover-cropped, so white-background products look empty and dark ones look like zoomed textures.
- Sections don't wrap: toolbars (location / search / sort), table rows and cart rows overflow horizontally instead of stacking on narrow screens.
- Long product names truncate hard; price/stock/SKU lines don't align.
- Admin shell (sidebar header, POS panels) isn't tuned for a standalone PWA window — no safe-area padding on some fixed bars, small tap targets.

## 1. Image fitting

- Standardise product image rendering: square container with `object-contain` on a neutral surface for catalogue/POS cards (no more cropping into the middle of a texture), keeping `object-cover` only for hero/lifestyle imagery.
- Add a shared `ProductThumb` presentational component (size + fallback initial + lazy loading + `decoding="async"`) and reuse it in POS grid, Products, Stock, Invoices line items.
- Serve smaller variants where the source supports it (Supabase/Cloudinary transform params) so 96px thumbs stop downloading full-size files.
- Consistent fallback placeholder when a product has no image.

## 2. Section wrapping and responsive layout

- Admin toolbars: switch fixed flex rows to `flex-wrap` with `min-w-0` children and full-width controls under `sm`. Applies to POS toolbar, Products, StockManagement, Orders, Invoices, Analytics filters.
- Tables that can't shrink get a mobile card view under `md` (label/value stacks) instead of horizontal scroll — Orders, Invoices, Stock movements first.
- POS: product grid `grid-cols-2` on phones with tighter gaps; cart panel becomes a bottom sheet on small screens instead of a squeezed side column.
- Enforce `min-w-0` / `truncate` discipline on flex children so long names stop pushing rows wide.

## 3. PWA shell polish

- Apply safe-area padding to admin header, POS bottom action bar and any fixed elements (currently only public header + WhatsApp button have it).
- Minimum 44px tap targets on icon buttons in admin.
- Prevent body horizontal scroll (`overflow-x: hidden` on the shell) and keep momentum scrolling in scroll areas.
- Dialogs on phones: full-height sheets with sticky footer actions so buttons are always reachable.

## Files

| File | Change |
|------|--------|
| `src/components/ui/product-thumb.tsx` | New shared thumbnail component |
| `src/pages/admin/POS.tsx` | Grid, image fit, wrapping toolbar, cart bottom sheet |
| `src/pages/admin/Products.tsx`, `StockManagement.tsx` | Thumb reuse, wrapping toolbars, mobile card rows |
| `src/pages/admin/Orders.tsx`, `Invoices.tsx` | Mobile card list under `md` |
| `src/pages/admin/Analytics.tsx` | Filter row wrapping, chart height on mobile |
| `src/components/admin/AdminLayout.tsx` | Safe-area header, tap targets |
| `src/index.css` | Shell overflow, tap target + safe-area utilities |

## Notes

- Presentation only — no data, business logic or permission changes.
- Verified after each step with a mobile-viewport browser pass (390x844) on POS, Products, Orders and the public shop.
