

## Plan: Gift Voucher / Shopping Voucher System

### Overview
Add a gift voucher feature where customers can purchase digital shopping vouchers for friends and family, with preset packages (100,000 / 150,000 / 300,000 RWF) and custom amounts. Vouchers expire after 1 year, are delivered via email + WhatsApp + downloadable PDF, and can be redeemed at checkout.

### Database Changes (2 new tables + 1 migration)

**`gift_vouchers` table:**
- `id`, `code` (unique 8-char alphanumeric), `amount`, `balance` (remaining), `status` (active/redeemed/expired)
- `buyer_name`, `buyer_email`, `buyer_phone`
- `recipient_name`, `recipient_email`, `recipient_phone`
- `personal_message` (optional gift message)
- `payment_method`, `payment_status`
- `expires_at` (purchase date + 1 year)
- `created_at`, `redeemed_at`
- RLS: anyone can insert (purchase), admin can view all, buyer/recipient can view own

**`voucher_redemptions` table:**
- `id`, `voucher_id`, `order_id`, `amount_used`, `created_at`
- Tracks partial redemptions against orders

### New Pages & Components

1. **`/gift-vouchers`** — Public page to browse and purchase vouchers
   - Three preset cards (100K, 150K, 300K RWF) with attractive design
   - Custom amount input option
   - Buyer info, recipient info, personal message form
   - Payment method selector (MTN MoMo, Airtel Money, Card only)
   - Order summary and purchase button

2. **`/gift-vouchers/confirmation/:code`** — Purchase confirmation page
   - Shows voucher details, PDF download button
   - Confirmation that email/WhatsApp were sent

3. **Admin: Gift Vouchers management** — New admin page
   - List all vouchers with status, balance, buyer/recipient
   - Approve/reject voucher payments (same flow as orders)
   - View redemption history

### Checkout Integration

- Add "Apply Voucher" input field on the checkout page
- Validate voucher code, check balance and expiry
- Deduct voucher amount from order total (partial use allowed, remaining balance preserved)
- Record redemption in `voucher_redemptions`

### Delivery (Edge Function)

- **Email**: Send voucher details + PDF attachment to recipient via existing `notify-customer` function
- **WhatsApp**: Send voucher link via WhatsApp using the existing WhatsApp number in business settings
- **PDF**: Generate a branded voucher PDF (voucher code, amount, expiry, personal message) — served as downloadable link

### Edge Function: `generate-voucher-pdf`
- Generates a branded PDF voucher with the DreamNest logo, voucher code, amount, recipient name, personal message, and expiry date
- Returns PDF as downloadable file

### Navigation
- Add "Gift Vouchers" link to the main header navigation
- Add "Gift Vouchers" to admin sidebar

### Files to Create
- `supabase/migrations/...` — gift_vouchers + voucher_redemptions tables, RLS, voucher code generator function
- `src/pages/GiftVouchers.tsx` — public purchase page
- `src/pages/GiftVoucherConfirmation.tsx` — confirmation page
- `src/pages/admin/GiftVouchers.tsx` — admin management page
- `supabase/functions/generate-voucher-pdf/index.ts` — PDF generation

### Files to Edit
- `src/App.tsx` — add routes
- `src/pages/Checkout.tsx` — add voucher code redemption field
- `src/components/layout/Header.tsx` — add nav link
- `src/components/admin/AdminSidebar.tsx` — add admin nav link

### Technical Details
- Voucher codes: 8-character uppercase alphanumeric, generated via DB function
- Partial redemption supported (balance tracked)
- Expired vouchers checked at redemption time
- Payment approval follows same pattern as online orders (admin approves before voucher activates)

