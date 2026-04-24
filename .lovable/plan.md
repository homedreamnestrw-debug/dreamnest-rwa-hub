

## Plan: Unify Stock Pages + Add Import/Export

Reorganize the sidebar so **Products**, **Categories**, **Locations**, and the existing **Stock Management** views live together under a single **Stock** hub with tabs. Add **CSV export** (always) and **CSV import** (with prefilled templates) on each tab.

### 1. Sidebar Reorganization (`AdminSidebar.tsx`)

Replace the current Catalog group entries with a single collapsed entry:

```
Catalog
  └── Stock   (Ad+St)
```

Remove standalone `Products`, `Categories`, `Stock`, `Locations` items. The unified page will live at `/admin/stock`.

### 2. New Unified Stock Hub (`src/pages/admin/Stock.tsx`)

Wraps the existing screens as tabs in one page:

```
[ Inventory ] [ Products ] [ Categories ] [ Locations ] [ Movements ]
```

- **Inventory / Movements / Low Stock**: current `StockManagement.tsx` content (split its existing tabs across the new tabs).
- **Products**: full `Products.tsx` admin UI (add/edit/delete/search).
- **Categories**: full `Categories.tsx` admin UI.
- **Locations**: full `Locations.tsx` admin UI (admin-only tab — hidden for staff).

Existing pages are refactored into reusable section components (`ProductsSection`, `CategoriesSection`, `LocationsSection`, `InventorySection`) so logic isn't duplicated. The standalone routes (`/admin/products`, `/admin/categories`, `/admin/locations`) redirect to `/admin/stock?tab=...` for backward compatibility.

### 3. Import / Export Toolbar (per tab)

A shared `ImportExportBar` component appears at the top of each tab with two buttons:

- **Export CSV** — downloads current filtered rows.
- **Import CSV** — opens a dialog with:
  - "Download template" link (a CSV pre-filled with the correct headers + 1 example row + valid options for enums/IDs in a comment row).
  - File picker that parses CSV client-side, shows a preview table, then bulk upserts via Supabase.

#### Per-tab specifics

| Tab | Export columns | Import columns (prefilled template) | Insert/Upsert target |
|---|---|---|---|
| Products | name, slug, sku, price, cost_price, stock_quantity, low_stock_threshold, category_name, is_active, featured, tax_enabled | same (category resolved by name; `slug` auto-generated if blank) | `products` upsert on `slug` |
| Categories | name, slug, description, image_url | same | `categories` upsert on `slug` |
| Locations | name, address, is_active | same | `stock_locations` upsert on `name` |
| Inventory | product_name, sku, location_name, quantity, low_stock_threshold | product_sku, location_name, quantity | `product_stock` upsert on `(product_id, location_id)` after resolving SKU + location name to IDs; logs a `stock_movements` row of type `adjustment` |
| Movements | date, product, type, qty, before, after, location, reason | (export-only — no import) | — |

### 4. Reports (Export)

Add a top-right **"Export Report"** dropdown on the hub page with one-click CSVs:
- Full inventory snapshot (all products × all locations with current quantities).
- Low-stock report.
- Stock movements (last 30/90 days).
- Category summary (products per category, total value at cost).

### 5. Technical Notes

- CSV parsing: lightweight inline parser (no new dep) — handles quoted fields and commas. If complexity grows we can swap to `papaparse`.
- Template generation: served as a client-side `Blob` download, headers prefilled, plus a sample row using **real existing data** (e.g. first existing category name, first location name) so users see valid values.
- Import flow: parse → validate (required fields, FK lookups by name/SKU) → preview dialog with row count + errors highlighted → confirm → batched Supabase upserts (chunks of 100) → toast with success/failure counts → refresh tab data.
- Permissions: Locations tab and Locations import/export hidden when `!isAdmin`. All existing RLS policies remain unchanged.
- No DB migration required.

### Files

**New**
- `src/pages/admin/Stock.tsx` (hub with tabs)
- `src/components/admin/stock/ImportExportBar.tsx`
- `src/components/admin/stock/ImportDialog.tsx`
- `src/components/admin/stock/sections/ProductsSection.tsx`
- `src/components/admin/stock/sections/CategoriesSection.tsx`
- `src/components/admin/stock/sections/LocationsSection.tsx`
- `src/components/admin/stock/sections/InventorySection.tsx`
- `src/lib/csv.ts` (parse + serialize helpers)

**Edited**
- `src/components/admin/AdminSidebar.tsx` (collapse Catalog group)
- `src/App.tsx` (redirect old routes to `/admin/stock`)
- `src/pages/admin/Products.tsx`, `Categories.tsx`, `Locations.tsx`, `StockManagement.tsx` → reduced to thin wrappers around the new section components (kept for the redirect targets).

