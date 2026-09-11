# Calendar alerts and overdue badge

## What will change

- Add a shared calendar-alert data hook that follows the existing Admin/Staff access rules automatically.
- Count pending events and unfinished tasks due from now through the next 24 hours.
- Show those upcoming calendar items at the top of the notification bell, with date/time, priority, and a link to the Calendar page.
- Include upcoming calendar items in the bell’s red count without changing stored notification read status.
- Count unfinished tasks whose due date/time has passed and show that count as a red badge on the Calendar sidebar item, including when the sidebar is collapsed.
- Refresh counts after calendar changes, periodically while the admin area is open, and when the browser window regains focus.
- Update the roadmap to mark this Phase 2 item complete.

## Technical details

- Read `calendar_events` and `calendar_tasks` through Supabase; their current access policies already restrict staff to assigned/created records while admins see all.
- Use Kigali-local date/time values for all-day and untimed items, and exclude completed/cancelled records.
- Reuse the existing semantic badge/button styles and notification popover; no database migration is needed.
- Verify the production build and test the rendered admin controls where authentication permits.
