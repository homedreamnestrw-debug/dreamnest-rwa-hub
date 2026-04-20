
## Goal
Reorganize the admin sidebar into clearer groups, make POS Terminal the default landing page, and hide admin-only pages from staff users.

## Admin-only vs Staff-accessible (based on RLS policies)

**Admin-only** (hidden from staff):
- Staff (manages user_roles — admin only)
- Suppliers (RLS: admin only)
- Purchase Orders (RLS: admin only)
- Expenses (RLS: admin only)
- Payment Approvals / Finance (approves orders — admin only)
- Analytics (financial insights — admin only)
- Settings (business_settings — admin only)
- Dashboard (financial overview — admin only)

**Staff + Admin**:
- POS Terminal, Orders, Invoices, Gift Vouchers, Products, Categories, Stock, Customers, Messages

## New Menu Structure

```text
DreamNest
─────────────────────
SALES
  • POS Terminal      (default landing — staff + admin)
  • Orders            (staff + admin)
  • Invoices          (staff + admin)
  • Gift Vouchers     (staff + admin)

CATALOG
  • Products          (staff + admin)
  • Categories        (staff + admin)
  • Stock             (staff + admin)

PEOPLE
  • Customers         (staff + admin)
  • Messages          (staff + admin)
  • Staff             (admin only)

OPERATIONS              (admin only — entire group hidden from staff)
  • Suppliers
  • Purchase Orders
  • Expenses

INSIGHTS                (admin only — entire group hidden from staff)
  • Dashboard
  • Analytics
  • Payment Approvals
─────────────────────
Footer:
  • Settings (admin only)
  • View Store (everyone)
  • Sign Out (everyone)
```

## Changes

### 1. `src/App.tsx`
- Change `/admin` index route from `<Dashboard />` to `<POS />`.
- Add new route `<Route path="dashboard" element={<Dashboard />} />` so Dashboard is reachable at `/admin/dashboard`.
- Wrap admin-only child routes (`dashboard`, `analytics`, `suppliers`, `purchase-orders`, `expenses`, `finance`, `staff`, `settings`) in `<ProtectedRoute requiredRole="admin">` so direct URL access is blocked for staff.

### 2. `src/components/admin/AdminSidebar.tsx`
- Replace current 3 groups with the 5 new groups above.
- Each item gets an optional `adminOnly: true` flag.
- Read `isAdmin` from `useAuth()`; filter items where `adminOnly` is true and the user is not admin.
- If a whole group becomes empty after filtering, hide the entire group (label + content).
- Update active-route logic so POS is highlighted at both `/admin` and `/admin/pos`.
- Footer: hide Settings link when not admin.

### 3. No other files need changes
- `Dashboard.tsx`, `POS.tsx`, etc. remain untouched.

## Notes
- Sidebar visibility is UX only; the **route guard** in step 1 is what actually enforces access.
- Existing deep links keep working; only `/admin` (now POS) and `/admin/dashboard` (new) shift.
