

## Plan: Contact Form — Admin View + Email Notification

### What exists now
- Contact form saves submissions to `contact_submissions` table in Supabase
- No admin page to view/manage these messages
- No email notification when a new message arrives

### What we'll build

**1. Admin Messages Page (`src/pages/admin/Messages.tsx`)**
- Table showing all contact submissions (name, email, subject, date, read/unread badge)
- Click to expand and read the full message
- Mark as read/unread toggle
- Search/filter capability
- Add route in `App.tsx` and link in `AdminSidebar`

**2. Email Notification on New Submission**
- After saving to the database, call the existing `notify-customer` Edge Function to send an email to `sales@dreamnestrw.com` with the submission details (sender name, email, subject, message)
- This uses the same Zoho SMTP setup already configured
- Also send a confirmation reply to the customer ("Thanks for reaching out, we'll get back to you soon")

### Technical details
- Reuse the existing `notify-customer` Edge Function for both the admin notification and customer confirmation emails
- Admin sidebar gets a "Messages" link with unread count badge
- Contact form `handleSubmit` gets two additional `supabase.functions.invoke("notify-customer", ...)` calls after the insert

