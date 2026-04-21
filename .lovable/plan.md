

## Goal
Give admins a real **Locations** management page, link inventory to locations per product, and make existing flows (POS, transfer, adjust, low-stock) respect per-location stock.

## What's broken today
- `stock_locations` table exists but **no admin UI to create/edit** locations — only the seeded "Main Showroom" exists.
- `products.stock_quantity` is a single global number — no per-location stock for non-variant products. Only `variant_stock` is per-location.
- `StockManagement` "Transfer" button just inserts two movement log rows — it does **not** actually move stock between locations.
- POS reads `selectedLocation` but stock deduction ignores it (deducts from the global `products.stock_quantity`).

## Plan (in dependency order)

### Step 1 — Database (migration)
1. **New table `product_stock`** (per-product, per-location quantities — mirrors `variant_stock`):
   ```
   product_stock(id, product_id, location_id, quantity int default 0,
                 unique(product_id, location_id))
   ```
   RLS: admin/staff manage + view.
2. **Backfill**: for every existing product, insert one `product_stock` row at the default location (`Main Showroom`) with `quantity = products.stock_quantity`. This keeps current totals intact.
3. **Keep `products.stock_quantity` as the rolled-up total** (sum across locations) — simplest, no breaking changes to Shop / Cart / Checkout / public reads. Maintained by trigger:
   - `trg_sync_product_total_stock` on `product_stock` (AFTER INS/UPD/DEL): recompute `products.stock_quantity = SUM(product_stock.quantity) WHERE product_id = X`.
4. **Update `deduct_stock_on_order_item` trigger**: when `orders.location_id` is set, deduct from `product_stock` at that location (with `FOR UPDATE` + insufficient-stock guard). The total on `products` is then refreshed by the sync trigger. If `location_id` is null (legacy online order), fall back to default location.
5. **Update `approve_order_payment`**: same — deduct per location row.

### Step 2 — Locations admin page
- New route `/admin/locations` → `src/pages/admin/Locations.tsx`.
- List all `stock_locations` (name, address, active toggle, total stock value, # products carried).
- "Add Location" dialog → name + address. On create, auto-insert a `product_stock` row (qty 0) for every existing product so it appears in stock screens immediately.
- Edit / deactivate (no delete if any movement references it — show toast).
- Add to `AdminSidebar.tsx` under **Inventory** group with **Ad** visibility tag (admin-only, matches existing RLS).

### Step 3 — Stock Management upgrades
- **Overview tab**: add a Location filter dropdown. Table shows stock at the selected location (joins `product_stock`); "All Locations" shows the rolled-up total (current behaviour).
- **Adjust dialog**: location selector becomes **required**; adjustment writes to `product_stock` at that location (not to `products` directly). The DB trigger keeps the global total in sync.
- **Transfer dialog (real transfer now)**: in one Postgres function `transfer_stock(product_id, from_location, to_location, qty)` —
  - lock both `product_stock` rows,
  - check source has enough,
  - subtract from source, add to destination,
  - write two `stock_movements` rows (`-qty` from source, `+qty` to destination, type `transfer`).
- **Movement log**: already shows location — no change needed.

### Step 4 — Product form (Products.tsx)
- Replace the single `stock_quantity` input with a **per-location stock grid**:
  ```
  Main Showroom   [   12 ]
  Warehouse A     [    0 ]
  ──────────────
  Total           12 (auto)
  ```
- On save, upsert `product_stock` rows for each location. New products auto-get one row per active location at qty 0.

### Step 5 — POS deducts from selected location
- POS already passes `orders.location_id` — once the trigger update in Step 1 lands, deduction will hit the right `product_stock` row automatically. No POS code change needed beyond ensuring a location is always selected (already required).

### Step 6 — Low-stock alerts
- `StockManagement` low-stock tab adds a **Location** column and flags rows where `product_stock.quantity <= products.low_stock_threshold` for that specific location, in addition to the global view.

## Files touched
- New migration (table + trigger + functions + backfill)
- `src/pages/admin/Locations.tsx` (new)
- `src/pages/admin/StockManagement.tsx` (location filter, real transfer, per-location adjust)
- `src/pages/admin/Products.tsx` (per-location stock grid)
- `src/components/admin/AdminSidebar.tsx` (add Locations link, Ad tag)
- `src/App.tsx` (route for `/admin/locations`)

## Notes
- Storefront (`Shop`, `ProductDetail`, `Cart`, `Checkout`) stays unchanged — it keeps reading `products.stock_quantity` which is the auto-maintained total. Online orders without a location continue to deduct from the default location.
- Existing single "Main Showroom" + current stock numbers are preserved by the backfill — nothing visible changes for the customer.
- Admin-only access for the Locations page (consistent with `stock_locations` RLS where only admin can manage).

