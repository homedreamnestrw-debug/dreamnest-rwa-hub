
## Goal
Show a small visibility tag next to each sidebar item indicating who can access it: **Ad** (admin only), **St** (staff only), or **Ad+St** (both).

## Changes

### `src/components/admin/AdminSidebar.tsx`
- Add a `visibility` field to each `NavItem`: `"admin"` | `"staff"` | `"both"`.
- All current items are either admin-only or both (no staff-only in this app), but support all three for future-proofing.
- Render a small badge after the item title (only when sidebar is expanded):
  - `Ad` for admin-only — uses `bg-primary/15 text-primary`
  - `St` for staff-only — uses `bg-accent/30 text-accent-foreground`
  - `Ad+St` for both — uses `bg-muted text-muted-foreground`
- Badge is a tiny inline `<span>` with `text-[9px] uppercase tracking-wide rounded px-1 py-0.5 ml-auto`.
- Visibility filter logic stays the same (admin-only items still hidden from staff).

### No other files change.
