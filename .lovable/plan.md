# Add Stock Manager Role

## Behavior

**Stock Manager = Staff + power over stock, catalog & procurement.** Admins keep full authority over everything (including managing Stock Managers).

| Area | Customer | Staff | Stock Manager | Admin |
|---|---|---|---|---|
| POS, Orders, Invoices, Customers, Messages, Gift Vouchers | — | ✅ | ✅ | ✅ |
| Stock (view/adjust/transfer/movements) | — | view | ✅ full | ✅ |
| View product **cost price** | — | ❌ | ✅ | ✅ |
| Products / Variants (create/edit, features) | — | ❌ | ✅ | ✅ |
| Suppliers, Purchase Orders | — | ❌ | ✅ | ✅ |
| Stock Locations (create/edit) | — | ❌ | ✅ | ✅ |
| Dashboard, Analytics, Expenses, Finance, Credit, Settings, Staff mgmt | — | ❌ | ❌ | ✅ |

## Technical changes

### 1. Database migration
- Add `'stock_manager'` value to `app_role` enum.
- Update RLS policies that currently allow only `admin` on these tables to also allow `stock_manager`:
  - `products`, `product_variants`
  - `product_stock`, `variant_stock`, `stock_movements`, `stock_locations`
  - `suppliers`, `purchase_orders`, `purchase_order_items`
  - `categories` (already admin OR staff — add stock_manager)
- Update SECURITY DEFINER functions to authorize `stock_manager` alongside admin where appropriate:
  - `get_admin_products_with_costs` (cost visibility)
  - `transfer_stock`, `transfer_variant_stock`, `adjust_variant_stock` (already accept admin OR staff — extend to stock_manager explicitly; keep staff out of cost-price view)
- Do **not** grant stock_manager access to `expenses`, `business_settings`, `user_roles` management, finance, or staff promotion functions.

### 2. Auth context (`src/contexts/AuthContext.tsx`)
- Add `"stock_manager"` to `AppRole` type.
- Add derived helpers: `isStockManager` and `canManageStock = isAdmin || isStockManager`.
- Keep `isStaff = staff || stock_manager || admin` so stock managers inherit staff areas.

### 3. ProtectedRoute (`src/components/ProtectedRoute.tsx`)
- Add `"stock_manager"` to `requiredRole` union.
- Add `canManageStock` gate option for routes that require admin OR stock_manager.

### 4. Routing (`src/App.tsx`)
- Wrap `suppliers`, `purchase-orders` routes in a gate that allows admin OR stock_manager (instead of admin-only).
- `products`, `stock`, `stock-management` already under staff gate — page-level UI will reveal edit controls based on `canManageStock`.

### 5. Sidebar (`src/components/admin/AdminSidebar.tsx`)
- New `Visibility` value `"stockPlus"` (admin + stock_manager) for Suppliers and Purchase Orders.
- Add a new visibility tag rendering (e.g. `Ad+SM`).
- Filter logic: show item if user role matches its visibility.

### 6. Page-level gating
- `Products.tsx`: show "Cost price" column/inputs and Add/Edit/Delete buttons when `canManageStock`; staff sees read-only product list without cost.
- `Stock.tsx` / `StockManagement.tsx`: replace `isAdmin`-gated controls (Locations tab, adjust/transfer actions) with `canManageStock`.
- `Suppliers.tsx`, `PurchaseOrders.tsx`: no change beyond route gate.

### 7. Staff management (`src/pages/admin/Staff.tsx`)
- Add `"Stock Manager"` to the role `Select` in the Add dialog.
- In the table actions, add Promote/Demote buttons covering staff ↔ stock_manager ↔ admin transitions.
- Update stats cards to include a Stock Managers count.
- Update `roleBadgeVariant` to render `stock_manager` distinctly.

## Out of scope
- No changes to customer-facing storefront.
- No changes to POS variant multi-select work.
- No new tables.
