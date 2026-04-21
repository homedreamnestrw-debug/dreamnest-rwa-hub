
## Goal
Stop online shop from selling out-of-stock products, repair the negative stock that already exists, and make sure approving an online payment also marks the order as **paid**.

## Root causes found

1. **Negative stock allowed on shop**
   - `src/pages/ProductDetail.tsx` only blocks Add-to-Cart when `stock_quantity === 0`. Anything below 0 (e.g. `-5`) is treated as "in stock" and the buy button stays enabled.
   - `Checkout.tsx` does not re-validate live stock before inserting `order_items`, so guests can place orders even when nothing is left.
   - DB trigger `deduct_stock_on_order_item` blindly subtracts quantity → stock goes negative.

2. **Approved online orders still show "Unpaid"**
   - The `approve_order_payment` Postgres function sets `payment_approved = true` and `status = 'processing'` but **never updates `payment_status`**. So in Orders / Invoices the badge stays `unpaid` forever.

3. **Existing negative stock in DB** (e.g. Bamboo Bath Robe `-5`, Egyptian Cotton Sheet `-20`, Silk Duvet `-5`, Turkish Bath Towel `-7`) — historical bad data from #1+#2.

## Fixes

### A. Frontend — block out-of-stock purchases
- **`src/pages/ProductDetail.tsx`**
  - Treat `stock_quantity <= 0` as out of stock (button disabled, label "Out of Stock", quantity selector capped at `max(stock_quantity, 0)`).
  - Cap quantity input so user cannot exceed `stock_quantity`.
  - Show "Only X left" only when `stock_quantity > 0 && <= low_stock_threshold`.
- **`src/pages/Shop.tsx`** — show "Out of stock" when `stock_quantity <= 0` (not only `=== 0`).
- **`src/hooks/useCart.ts`** — in `addItem`, refuse and toast if requested `quantity > product.stock_quantity` (or stock ≤ 0). Same guard inside `updateQuantity`.

### B. Checkout — final server-side stock validation
- **`src/pages/Checkout.tsx` `handleSubmit`** — before inserting the order, fetch fresh `stock_quantity` for every cart product id in one query. If any item's quantity exceeds available stock (or stock ≤ 0), abort with a toast listing the offending items and do **not** create the order. This closes the race window where stock changed after page load.

### C. Database — make stock deduction safe + fix payment status

Migration with three changes:

1. **Update `approve_order_payment`** so it also sets `payment_status = 'paid'` and `paid_at`-style timestamp on the order. This fixes "approved orders still show Unpaid".
   ```sql
   UPDATE public.orders
   SET payment_approved = true,
       payment_approved_by = auth.uid(),
       payment_approved_at = now(),
       payment_status = 'paid',
       status = 'processing'
   WHERE id = order_id AND payment_approved = false;
   ```

2. **Harden `deduct_stock_on_order_item` trigger** to refuse negative stock:
   - Re-read `stock_quantity` with `FOR UPDATE` (row lock).
   - If `prev_stock < NEW.quantity`, `RAISE EXCEPTION 'Insufficient stock for product %'` — this rolls back the order item insert and surfaces an error to the client.
   - Same guard should apply in `approve_order_payment` per item loop, so an admin approving an order whose stock has since been depleted is told instead of going negative.

3. **One-off data repair**: set every product with `stock_quantity < 0` back to `0` so the catalog is clean.
   ```sql
   UPDATE public.products SET stock_quantity = 0 WHERE stock_quantity < 0;
   ```
   (Logged via a single `stock_movements` row per product with `movement_type='adjustment'`, reason `Negative stock cleanup`.)

### D. UI follow-through for payment status
- No code change needed in `Orders.tsx` / `Invoices.tsx` — they already read `payment_status`. Once the DB function sets it correctly, the badges will flip to "Paid" automatically after approval.

## Files touched
- `src/pages/ProductDetail.tsx`
- `src/pages/Shop.tsx`
- `src/hooks/useCart.ts`
- `src/pages/Checkout.tsx`
- New migration: update `approve_order_payment` + `deduct_stock_on_order_item` + one-off `UPDATE products … WHERE stock_quantity < 0`.

## Notes
- After the DB migration, all 4 products currently in the negative will reset to `0` and immediately show as "Out of stock" in the storefront — admin will need to restock via the existing Stock Management page.
- No RLS changes required.
- No changes to POS flow — POS already auto-approves and the new stock guard will simply prevent overselling there too.
