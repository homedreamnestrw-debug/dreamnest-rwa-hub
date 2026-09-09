# Business Calendar & Task Manager

A new Calendar section in the admin panel at `/admin/calendar`, open to admins and staff. Staff see only items they created or that are assigned to them.

Delivered in two phases, as agreed.

## Phase 1 — Calendar, tasks, dashboard widget

### Data
Two new tables with access rules:
- **Calendar events** — title, description, type (reminder, task, delivery, invoice, marketing, staff, operations), start/end date and time, all-day flag, colour, priority, status, assigned person, creator, repeat settings, optional link to an invoice/purchase order/product/customer, reminder lead time, notes.
- **Tasks** — title, description, due date and time, priority, status (To do, In progress, Completed, Cancelled), assigned person, creator, category, optional link to an event, repeat settings, completion time.

Access: admins see everything; staff see only their own or assigned items. Both can be created by admin and staff.

### Calendar page
- Month, Week, Day and Agenda views with tabs; mobile opens on Agenda.
- Mini calendar in a side panel, Today button, previous/next arrows.
- Click a day to add an item; click an item to view, edit or delete; drag to reschedule.
- Colour coding by type: red urgent/payment, orange stock/delivery, yellow marketing, green completed, blue staff/operations, purple recurring, pink customer.
- Warm white and cream styling with terracotta highlights, rounded pill event bars, friendly empty state.

### Create/edit form
Title, type, date and time (or all-day), end date, priority, assignee, colour palette, repeat (daily/weekly/monthly/yearly with end never / after X / on date), reminder lead time (15 min to 3 days), optional link to an invoice, purchase order, product or customer, notes, and file attachments.

### Task panel
Four columns (To do, In progress, Completed, Cancelled) with drag between them, quick-add form, filters (assignee, priority, category, due range, status), sorting, one-click complete, overdue items in red, calendar icon on linked tasks, repeating tasks regenerate on completion.

### Dashboard widget
Today's date, the next five items with colour dots, overdue count in red, link to the full calendar, and a quick-reminder button.

## Phase 2 — Automation, emails, settings

### Automatic items
- Invoice with a due date creates a red high-priority event with reminders 3 days and 1 day before.
- Purchase order with an expected delivery date creates an orange event.
- Product hitting its low-stock threshold creates an urgent restock task due today.
- Preloaded repeating reminders: monthly sales review, monthly salaries, quarterly RDB check, yearly licence renewal, yearly stock audit.
- Rwanda public holidays preloaded for the year (with a no-promotions flag on 7 April), refreshed each year.

### Reminders and emails
- Bell in the admin header counts items due in the next 24 hours; red badge on the Calendar menu item when tasks are overdue.
- Reminder emails to the assigned person at their chosen lead time.
- Daily digest to the admin at 8:00 AM Kigali time.
- Monday overdue summary to the admin.
- Overdue marking happens automatically once a due date passes.

### Settings tab
New Calendar tab in Admin → Settings: default view, working hours (default 8:00–18:00), working days (default Mon–Sat), timezone fixed to Africa/Kigali, digest on/off and time, default reminder lead time, and a toggle for whether staff can see each other's items.

## Technical notes
- Tables `calendar_events` and `calendar_tasks` in Supabase, with grants, RLS scoped through `has_role` plus `assigned_to`/`created_by`, `updated_at` triggers, and indexes on date and assignee.
- Calendar UI built with `react-big-calendar` + the existing `date-fns` locale adapter, wrapped in a themed component using existing design tokens; drag-and-drop via its addon.
- New page `src/pages/admin/Calendar.tsx` with `CalendarView`, `EventDialog`, `TaskBoard`, `MiniCalendar` under `src/components/admin/calendar/`; route added in `App.tsx` inside the admin layout and a sidebar entry visible to admin and staff.
- Attachments go to the existing private `documents` bucket under a `calendar/` prefix.
- Auto-events use database triggers on `invoices`, `purchase_orders` and `products` (reusing the existing low-stock trigger pattern) writing rows as system-owned events.
- Reminder/digest delivery: a new `calendar-reminders` edge function sending through the existing Zoho SMTP setup, scheduled every 15 minutes with pg_cron; it also flags overdue items, sends the 8:00 AM Kigali digest and the Monday summary. That cadence means 96 runs a day; a longer gap would delay short-lead reminders such as the 15-minute one.
- Bell counts reuse `useNotifications`; calendar reminders also insert notification rows so existing phone push delivery works unchanged.
- Settings stored as new columns on `business_settings`, surfaced in a Calendar tab in `Settings.tsx`.
