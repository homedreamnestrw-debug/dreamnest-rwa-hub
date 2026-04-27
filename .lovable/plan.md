## Goal

Let one product have multiple varieties (size, color, etc.) with their own stock per location and optional price override. Variants are **opt-in per product** — every existing product keeps working unchanged (no variant = today's behavior).

## What's already in place (good news)

- `product_variants` table: `variant_name`, `sku`, `barcode`, `attributes` (jsonb), `price_override`, `is_active`
- `variant_stock` table: per `(variant_id, location_id)` quantity
- `variant_id` foreign keys already on `cart_items`, `order_items`, `purchase_order_items`, `stock_movements`
- Stock-deduction triggers already accept a `variant_id` column

So no destructive schema changes needed. We add a few helpers and wire the UI.

## Plan

### 1. Database (additive only)
- Add a `variant_attributes` JSONB column on `products` to store the **option schema** (e.g. `{"Size":["Single","Queen","King"],"Color":["Beige","Charcoal"]}`). Drives the admin form and storefront pickers. Defaults to `{}` so existing rows are untouched.
- Add a trigger `sync_variant_total_stock` that mirrors `sync_product_total_stock`: when `variant_stock.quantity` changes, recompute that variant's total into `product_variants.stock_quantity`, then recompute the parent product's `stock_quantity` as the sum across all variants (or fall back to direct `product_stock` when the product has no variants).
- Update `deduct_stock_on_order_item` and `approve_order_payment` so when `NEW.variant_id IS NOT NULL` they deduct from `variant_stock` (at the order's location) instead of `product_stock`. Logic for variant-less items stays as today.
- Add `seed_variant_stock_for_new_location` and `_for_new_variant` triggers (zero rows for every active location), parallel to the existing product_stock seeders.
- RLS: keep current policies (already correct — admin/staff manage, public reads variants via existing "Anyone can view variants" policy).

### 2. Admin — Products page (`src/pages/admin/Products.tsx`)
- Add a collapsible "Variants" section in the product dialog. When the user defines option types (Size, Color, Material…) and values, the UI generates the cartesian-product variant rows.
- Each row: auto-generated `variant_name` (e.g. "Queen / Beige"), editable SKU, optional price override, and a per-location stock input grid (reuses the existing locations list).
- Saving upserts `product_variants` then `variant_stock` rows.
- "Stock per Location" inputs at the product level are hidden once the product has variants (stock then comes from variants).

### 3. Admin — Stock Management (`src/pages/admin/StockManagement.tsx`)
- Expand each row that has variants into per-variant sub-rows showing per-location qty.
- Adjust/Transfer dialogs gain a variant picker when the selected product has variants. The existing `transfer_stock` RPC gets a sibling `transfer_variant_stock(p_variant_id, ...)` for variants.

### 4. Storefront — Product Detail (`src/pages/ProductDetail.tsx`)
- Replace the read-only variant chips with **option selectors** (one row of pills per attribute defined in `variant_attributes`).
- As selections are made, resolve the matching variant and show: its price (override or base), live stock at the default storefront location, and disable unavailable combinations.
- Add-to-cart passes `variant_id`. If a product has variants and none is selected, the button is disabled.

### 5. Cart, Checkout, OrderConfirmation
- `useCart` already carries `variant_id`. Extend the cart query to also fetch `product_variants(id, variant_name, price_override, attributes, sku)` and display the variant label under the product name.
- Use `price_override ?? product.price` in totals.
- Cart upsert key changes from `(user_id, product_id)` to `(user_id, product_id, variant_id)` so two variants of the same product coexist (DB unique index update + small client tweak).
- Checkout/Order confirmation: render variant label beside line items.

### 6. POS (`src/pages/admin/POS.tsx`)
- Product search results show a small "Variants" badge for products with variants.
- Clicking such a product opens a quick variant picker (same option-pills layout, with stock per location shown for the POS's active location) before adding to the cart.
- Receipt printing & order creation already pass `variant_id` through `order_items`.

### 7. Other touch-ups
- **Purchase Orders**: variant picker in the line-item row (already has `variant_id` column). Receiving a PO increments the right `variant_stock` row.
- **Featured / Shop / Home queries**: no change — variants don't affect listing-card price (we keep showing the base price + a "from" hint when variants override).
- **Wishlist**: stays at product level (no variant_id needed).

## Backward compatibility

- Products with zero variants behave exactly as today (stock from `product_stock`, single price, single add-to-cart).
- All new columns/triggers are additive; existing migrations and data are untouched.
- The storefront and POS only show the variant UI when `variant_attributes` is non-empty AND active variants exist.

## Rollout order (so the preview never breaks)

1. Migration: add column, helper triggers, variant-aware deduction logic, cart unique key.
2. Admin Products dialog: define options + variants + per-location stock.
3. Storefront PDP variant selector + cart `variant_id` plumbing + cart line label.
4. POS variant picker.
5. Stock Management variant rows + variant transfer RPC.
6. Purchase Orders variant line items.

Each step is independently shippable; existing single-SKU products keep working through every step.

## Open question (can answer later)

Do you want a customer-facing "color swatch" (small colored circles) for the Color attribute, or are text pills enough for v1? Default: text pills, swatches as a follow-up once you upload color hex codes per option.