

## Plan: Enable Guest Cart & Guest Checkout

### Current State
- The `useCart` hook already supports guest cart via localStorage (add, update, remove, clear).
- The `Checkout` page already supports guest orders (guest_name, guest_email, guest_phone fields in orders table).
- **Problem**: `ProductDetail.tsx` does NOT use the `useCart` hook. It directly calls `supabase.from("cart_items").insert(...)` and blocks unauthenticated users with "Please sign in to add items to your cart".
- The Cart page and Checkout page are already public routes (no `ProtectedRoute` wrapper).

### Changes Required

**1. Update `src/pages/ProductDetail.tsx` — Use `useCart` hook instead of direct Supabase calls**
- Import and use `useCart().addItem` instead of manually inserting into `cart_items`.
- Remove the `if (!user)` guard on `addToCart` so guests can add items.
- Pass the full product object to `addItem()` so the guest cart has product details in localStorage.
- Keep the wishlist sign-in requirement (wishlist needs a user account).

**2. No database changes needed**
- The `orders` table already has `guest_name`, `guest_email`, `guest_phone` columns with nullable `customer_id`.
- The guest cart uses localStorage, no DB interaction.
- The Checkout page already handles guest order submission.

**3. No routing changes needed**
- `/cart` and `/checkout` are already public routes without `ProtectedRoute`.

### Summary
This is a single-file change in `ProductDetail.tsx` to wire up the existing `useCart` hook, removing the login requirement for adding to cart. Everything else (guest cart storage, guest checkout, guest order creation) is already implemented.

