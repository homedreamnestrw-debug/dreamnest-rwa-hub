# Analytics & Expenses — Reporting Upgrade

Make both pages decision-grade: flexible time windows, period comparisons, richer KPIs, drilldowns, and clean PDF/CSV exports. Frontend-only — no schema changes.

## 1. Shared report toolbar (new component)

A reusable `ReportToolbar` used on both pages.

- **Date range presets:** Today, Yesterday, Last 7d, Last 30d, This Month, Last Month, This Quarter, Year to Date, Last Year, Custom range (date picker).
- **Compare to previous period** toggle (auto-computes prior window of equal length).
- **Granularity selector:** Day / Week / Month (auto-default by range length).
- **Channel / Category / Payment / Staff filters** (multi-select where relevant).
- **Export menu:** CSV (current view), PDF report (branded), Print.

Persists last-used range to localStorage.

## 2. Analytics page additions

Replace the current 4-chart layout with a structured report:

**A. KPI strip (with vs. previous period deltas)**
- Revenue, Orders, Avg Order Value, Items Sold, Gross Profit (revenue − cost from `products.cost_price`), Margin %, Refunds/Cancelled value, New vs Returning customers.

**B. Trend section**
- Revenue & Orders line chart over selected granularity.
- Overlay previous-period line when compare is on.

**C. Mix & performance**
- Sales by Channel (existing, filtered).
- Order status distribution (existing, filtered).
- Revenue by Payment Method (existing, filtered).
- Top 10 Products by Revenue + Top 10 by Quantity (toggle).
- Top Categories by Revenue.
- Top Customers (by spend, by orders).
- Hour-of-day & Day-of-week heatmap (best selling times).

**D. Inventory signals (read-only)**
- Low-stock count, Out-of-stock count, Dead stock (no sales in range).

**E. Drilldown**
- Click any chart segment → opens dialog with the underlying orders/items list (with link to Orders page).

## 3. Expenses page additions

**A. KPI strip**
- This period total, Previous period total + % change, Daily average, Largest single expense, Count of expenses, Top category.

**B. Charts**
- Expenses over time (bar, by selected granularity).
- Expenses by Category (donut + table with % share).
- Category trend (stacked bar by month).
- Optional: Expenses vs Revenue line (pulls orders.total for same range) → shows net.

**C. Table improvements**
- Multi-filter (category, date range, amount min/max, has-receipt).
- Sortable columns, pagination, row totals footer.
- Bulk select → bulk delete / bulk export.

**D. Budgets (lightweight, localStorage only — no schema change)**
- Per-category monthly budget input; progress bar + over-budget badge in category breakdown.
- Clearly marked as local-only; mention we can persist to DB later if desired.

## 4. Exports

- **CSV:** export currently filtered rows (already partially there — extend with all new sections).
- **PDF report:** branded DreamNest header, period label, KPI cards, charts (rendered as images via `html2canvas`) and tables. One file per page (Analytics report / Expense report). Uses existing brand tokens.
- **Print stylesheet:** clean print view for the same report.

## Technical notes

- New files:
  - `src/components/admin/reports/ReportToolbar.tsx`
  - `src/components/admin/reports/KpiCard.tsx`
  - `src/components/admin/reports/useDateRange.ts` (presets + compare logic with `date-fns`)
  - `src/lib/reportPdf.ts` (html2canvas + jsPDF helper)
  - `src/lib/reportAggregations.ts` (pure functions: group by day/week/month, KPI calc, deltas)
- Edits: `src/pages/admin/Analytics.tsx`, `src/pages/admin/Expenses.tsx`.
- Deps to add: `jspdf`, `html2canvas` (date-fns already in project).
- Data access: continue using existing Supabase queries; fetch once per range then aggregate client-side. For large ranges, paginate orders fetch (>1000 row Supabase limit).
- Permissions unchanged: Analytics remains admin-only; Expenses follows current gating.

## Out of scope

- New DB tables (budgets persistence, scheduled email reports).
- Forecasting / ML.
- Multi-currency.

Confirm and I'll build it, or tell me which sections to drop/add.