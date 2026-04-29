## What's actually broken

Verified from the DB and code:

1. **Storefront shows every variant as "OUT"** even when stock exists.
   - Example: "Testing Sheets" has 6 active variants with 23 units of variant stock, but the product detail page strikes them all through.
   - Cause: the `useQuery` for variants in `src/pages/ProductDetail.tsx` uses **Supabase's default 1000-row limit and a stale cache key**, but the real bug is that `stock_quantity` on `product_variants` is the **sum across all locations**, while the UI logic just reads `candidate.stock_quantity`. When the trigger `sync_variant_total_stock` hasn't been refreshed (or for variants created before per-location seeding), the value stays at 0 even though `variant_stock` rows exist. We need to read from `variant_stock` directly (or the synced `stock_quantity`) **and** backfill / re-sync existing variants.

2. **Stock Hub → Inventory tab doesn't show variants.**
   - `StockManagement.tsx` only loads `products` + `product_stock`. Variants and `variant_stock` are completely ignored, so a product with variants shows `0` (or a stale total) and "Adjust" writes to `product_stock`, which is then **overwritten** by the variant-sync trigger as soon as anything changes. That's why "the quantity you added doesn't appear and adjustments don't stick".

3. **Total stock on the product row** (`products.stock_quantity`) for variant products is wrong because:
   - When a variant product is first created with non-zero `locationStock`, the Products form upserts to `product_stock` AND persists variants. The product-stock sync trigger sets `products.stock_quantity` from `product_stock`, then the variant-stock sync trigger overrides it from variants. The two paths fight. Result: "Testing Sheets" shows total=2 but variants sum to 23.

4. **Inventory CSV export, low-stock report, transfer dialog** — all variant-blind. Same root cause as #2.

5. **POS** already handles variants (good), but the picker reads `stock_quantity` on the variant which is currently unreliable for the same reason as #1.

## Fix plan

### A. Database — one migration

1. **Backfill `product_variants.stock_quantity`** = `SUM(variant_stock.quantity)` for every active variant, then re-sync `products.stock_quantity` for variant products from variants, and for non-variant products from `product_stock`. This fixes the existing wrong totals (Testing Sheets, Turkish Bath Towel Set).
2. **Harden `sync_product_total_stock`** so it does NOT overwrite `products.stock_quantity` when the product has active variants — variants are the source of truth in that case. Today both triggers write and the order they fire decides the outcome.
3. Add an **RPC `adjust_variant_stock(p_variant_id, p_location_id, p_new_qty, p_reason, p_movement_type)`** that upserts `variant_stock` and inserts a `stock_movements` row (with `variant_id` set). This gives the inventory UI a single safe entry point that mirrors `transfer_variant_stock`.

### B. Stock Hub → Inventory (`StockManagement.tsx`)

Make it variant-aware without breaking the simple case:

- Load `product_variants` (active) and `variant_stock` alongside products.
- New table layout: each product is a parent row; products with variants expand to show one sub-row per variant with its own per-location qty, threshold status and "Adjust" button.
- "Adjust" dialog:
  - For a non-variant product → existing `product_stock` upsert path (unchanged).
  - For a variant → call new `adjust_variant_stock` RPC.
- "Transfer" dialog gains a variant selector (uses `transfer_variant_stock` when a variant is chosen, otherwise existing `transfer_stock`).
- Movement log already stores `variant_id`; show the variant name next to the product.
- Summary cards count variants too (a product is "out of stock" only if every active variant is 0).

### C. Stock Hub → Inventory CSV import/export (`Stock.tsx`)

- Export now includes a `variant_sku` column (blank for products without variants); each row is product+variant+location.
- Import resolves by `variant_sku` first, then `product_sku`. Same logging via the new RPC.

### D. Products page (`Products.tsx`) — small fixes

- Hide the per-product "Stock per Location" block ONLY when variants exist (already done) — keep, but additionally **clear `product_stock` rows to 0** for that product when variants are introduced, so the old per-product numbers don't linger and confuse the inventory view.
- Show variant total stock in the products table for variant products (sum of variant stock) instead of the possibly-stale `stock_quantity`.

### E. Storefront `ProductDetail.tsx`

- Query variants together with their per-location totals: `product_variants(id, …, stock_quantity)`. After the DB backfill in A.1, `stock_quantity` becomes reliable, so the existing `inStock = candidate.stock_quantity > 0` check starts working and the strike-through disappears.
- Add a small fallback: if `stock_quantity` is 0 but the variant has any `variant_stock` row > 0, treat as in stock (defensive).
- Same fix benefits the POS variant picker automatically.

### F. Shop listing

`Shop.tsx` uses `product.stock_quantity` for the "Out of stock" pill. Once A.1/A.2 are in place, that becomes correct for variant products too — no code change needed.

## Files touched

```
supabase/migrations/<new>.sql           backfill + trigger guard + adjust_variant_stock RPC
src/pages/admin/StockManagement.tsx     variant-aware table, adjust + transfer dialogs
src/pages/admin/Stock.tsx               CSV export/import include variant_sku
src/pages/admin/Products.tsx            zero out product_stock when introducing variants; show variant totals
src/pages/ProductDetail.tsx             defensive in-stock check; rely on synced totals
```

## What this does NOT change

- Cart, checkout, order creation, and the stock-deduction triggers — they already handle `variant_id` correctly.
- The POS UI flow (variant picker stays as-is, just reads correct stock).
- RLS policies — existing policies cover the new RPC (it's `SECURITY DEFINER` with admin/staff guard like `transfer_variant_stock`).

After this, adding a product with variants in Products will immediately appear in Inventory with editable per-location stock per variant; the storefront and POS will reflect actual availability; and adjustments made in Inventory will persist and be reflected back on the product page.
