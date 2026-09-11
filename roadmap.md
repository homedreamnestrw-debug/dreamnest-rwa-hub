# DreamNest roadmap

## Business Calendar & Task Manager

### Done (Phase 1)
- Calendar events + tasks tables with access rules (admin sees all, staff sees own/assigned)
- Calendar page at /admin/calendar: month, week, day, agenda views, mini calendar, today/prev/next, drag to reschedule, colour legend
- Event create/edit form: type, dates/times, all-day, priority, assignee, colour, repeats, reminder lead time, link to invoice/PO/product/customer, notes, attachments
- Task board: To Do / In Progress / Completed / Cancelled, drag between columns, quick add, filters, sorting, one-click complete, overdue in red, repeating tasks regenerate
- Dashboard widget: today, next 5 items, overdue count, quick reminder
- Sidebar entry for admin and staff

### Open (Phase 2)
- Auto-events from invoice due dates, purchase order delivery dates, low stock
- Preloaded recurring business reminders (monthly sales review, salaries, quarterly RDB, yearly licence/audit)
- Rwanda public holidays preloaded, with no-promotions flag on 7 April
- Bell count for items due in next 24 hours + red badge on the Calendar menu item
- Reminder emails, 8:00 AM Kigali daily digest, Monday overdue summary (Zoho SMTP + scheduled job)
- Automatic overdue marking in the database
- Calendar tab in Admin → Settings: default view, working hours/days, digest toggle, default reminder, staff visibility toggle
