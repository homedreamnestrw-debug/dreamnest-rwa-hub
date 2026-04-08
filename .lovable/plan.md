

# Phase 1: Database Schema Migration

## What We Will Do

Create a single comprehensive Supabase migration that combines the entire reference project schema plus new tables for the expanded DreamNest scope. This migration will set up everything needed to start building the app.

## Migration Contents

### Enums (7)
- `app_role` (admin, staff, customer)
- `order_status` (pending, processing, shipped, delivered, cancelled)
- `payment_status` (unpaid, partial, paid, refunded)
- `document_type` (invoice, proforma, receipt, quote)
- `document_status` (draft, sent, paid, overdue, cancelled, accepted, declined, expired)
- `stock_movement_type` (sale, restock, adjustment, return, transfer)
- `sale_channel` (online, in_store)
- `payment_method` (cash, card, mtn_momo, airtel_money, stripe)
- `po_status` (draft, sent, received, cancelled) — **new**

### Tables from Reference (ported directly)
| Table | Key columns |
|-------|------------|
| `categories` | name, slug, image_url |
| `products` | name, price (BIGINT/RWF), sku, cost_price, stock_quantity, low_stock_threshold, tax_enabled |
| `profiles` | user_id, full_name, phone, shipping_address, city |
| `user_roles` | user_id, role (app_role enum) |
| `orders` | order_number (SERIAL), customer_id, channel, status, payment_method, subtotal/tax/discount/total |
| `order_items` | order_id, product_id, quantity, unit_price, discount, total |
| `invoices` | document_number (auto-generated), document_type, status, tax_rate, due_date |
| `invoice_items` | invoice_id, description, quantity, unit_price, total |
| `stock_movements` | product_id, movement_type, quantity, previous_stock, new_stock, reason |
| `expenses` | category, amount, expense_date, receipt_url |
| `newsletter_subscribers` | email |
| `business_settings` | single-row config (business_name, vat_%, logo, contact info) |
| `credit_payments` | order_id, amount, payment_method |

### New Tables (extending beyond reference)
| Table | Purpose |
|-------|---------|
| `suppliers` | Supplier directory: name, contact_person, phone, email, address, payment_terms |
| `purchase_orders` | POs to suppliers with auto-numbered PO-0001 format, po_status enum |
| `purchase_order_items` | Line items per PO: product_id, quantity, unit_cost |
| `product_variants` | Size/color/material variants per product, own SKU + barcode + price_override |
| `stock_locations` | Multi-location inventory: name, address, is_active |
| `variant_stock` | Stock count per variant per location |
| `loyalty_points_log` | Points earned/redeemed/expired/adjusted per customer |
| `wishlist_items` | User wishlisted products |
| `reviews` | Product reviews with rating, comment, is_approved flag |
| `cart_items` | Per-user shopping cart with optional variant_id |
| `contact_submissions` | Contact form entries |

### Business Settings Additions
Add columns: `loyalty_points_rate`, `loyalty_redemption_rate`, `loyalty_tiers` (JSONB), `whatsapp_number`, `smtp_host`, `smtp_port`, `smtp_user`

### Security
- `has_role()` security-definer function (prevents RLS recursion)
- RLS enabled on **every** table
- Policies follow reference patterns:
  - Public read on products, categories, business_settings
  - Customers see only their own data (orders, profile, wishlist, cart, loyalty, reviews)
  - Staff + Admin access POS, inventory, stock, customers
  - Admin-only for expenses, settings updates, role management, suppliers

### Triggers & Functions
- `update_updated_at_column()` — auto-updates `updated_at` on all relevant tables
- `handle_new_user()` — auto-creates profile + assigns `customer` role on signup
- `generate_document_number()` — auto-generates INV-0001, PRF-0001, REC-0001, QTE-0001
- `deduct_stock_on_order_item()` — auto-deducts stock and logs movement on sale
- Document number sequences: invoice, proforma, receipt, quote, **purchase_order** (PO-0001)

### Storage Buckets
- `product-images` — public, with admin/staff upload policies
- `documents` — private, admin/staff only
- `business-assets` — public, admin only upload

### Indexes
All key foreign keys and commonly filtered columns indexed (category, status, channel, dates, user_id, product_id, etc.)

### Seed Data
- Default business_settings row (DreamNest, sales@dreamnestrw.com, Kigali Rwanda)
- Default stock location: "Main Showroom"

## Implementation
One migration file: `supabase/migrations/20260408_initial_schema.sql` containing all of the above in a single atomic migration. No email infrastructure (pgmq/cron) will be included in this migration — that will come in a later phase.

