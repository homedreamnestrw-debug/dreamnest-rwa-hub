## Goal

In the POS variant picker dialog, let the cashier add several variants of the same product to the cart in one step, each with its own quantity — instead of being forced to pick one attribute combination, confirm, and reopen the dialog for the next variant.

## UX

Replace the current "attribute dropdowns → single matched variant → qty prompt" flow with a single dialog that lists every active variant of the product:

```text
Pillowcases
─────────────────────────────
Variant            Stock  Qty
[ ] White / Small    12   [ 0 ▲▼ ]
[ ] White / Large     4   [ 0 ▲▼ ]
[x] Beige / Small     7   [ 2 ▲▼ ]
[x] Beige / Large     3   [ 1 ▲▼ ]
[ ] Grey  / Small     0   out of stock (disabled)
─────────────────────────────
Selected: 2 variants, 3 units      [Cancel]  [Add 3 items]
```

Behaviour:
- One row per variant from `variantPickerOptions` (already location-aware).
- Checkbox toggles inclusion; checking auto-sets qty to 1, unchecking resets to 0.
- Qty stepper clamped to `1..stock_quantity`. Rows with `stock_quantity <= 0` show "Out of stock" and are disabled.
- "Add N items" button adds each selected variant to the cart by reusing the existing `addToCart(product, qty, variant)` (which already merges with existing cart lines and respects stock).
- Disabled when nothing is selected or any selected qty exceeds stock.
- Search/keyboard: a small filter input at the top of the list when the product has many variants (>8).

Single-variant products (no `product_variants` rows, only `variant_attributes` schema on the product) keep today's behaviour — fall back to the existing attribute-dropdown picker when `variantPickerOptions` is empty, so imported-but-not-expanded products still work.

## Code changes (all in `src/pages/admin/POS.tsx`)

1. Replace `variantPickerSelections: Record<string,string>` with `variantPickerQuantities: Record<string, number>` (key = variant id).
2. Rewrite the variant picker `<Dialog>` body:
   - When `variantPickerOptions.length > 0` → render the multi-select list described above.
   - Else (legacy attribute-only product) → keep the existing per-attribute `Select` UI and single `confirmVariantPick`.
3. Replace `confirmVariantPick` with `confirmVariantMultiPick` that iterates entries of `variantPickerQuantities` with `qty > 0`, calls `addToCart(variantPickerProduct, qty, variant)` for each, then closes the dialog.
4. Remove the now-unused `matchedPickerVariant` / `variantOptionNames` paths only for the multi-select branch (keep them for the legacy branch).
5. Keep the existing `qtyPromptProduct` flow untouched — it still handles products without variants.

## Out of scope

- No DB or RPC changes; stock validation continues to rely on `addToCart`'s stock check and the existing `deduct_stock_on_order_item` trigger.
- No changes to the cart, checkout, invoice, or order creation logic.
- No changes to the customer-facing storefront variant selector.
