# Push Notifications Roadmap (Android + iOS)

## Where notifications can appear

| Surface | Android / Chrome | iOS (16.4+) | Notes |
|---|---|---|---|
| Web Push (system notification tray) | Yes, browser or installed PWA | Only when the app is installed to Home Screen | Requires a service worker (the app has none today) |
| In-app toasts / bell inbox | Yes | Yes | Works everywhere, no permission needed |
| Email (already live via Zoho SMTP) | Yes | Yes | Existing `notify-customer` function |
| WhatsApp link (already live) | Yes | Yes | Manual, not automated |

Key constraint: on iOS, push only works after the user installs the PWA (the existing install prompt becomes a prerequisite). Notifications on iOS cannot be requested from Safari tabs.

## What is missing today

- No service worker is registered, so no web push is possible yet.
- The manifest and install prompt exist, which covers the iOS install prerequisite.
- No table for push subscriptions and no notification history.

## Roadmap

### Phase 1 — In-app notification centre (no permissions, works everywhere)
- New `notifications` table (user_id, title, body, type, link, read_at).
- Bell icon in the admin header and customer account with unread badge, realtime updates via Supabase realtime.
- Triggers: new order, low stock, credit payment received, new contact message.
- Value: staff see events immediately while the app is open. Low risk, no platform limits.

### Phase 2 — Web push foundation
- Add a service worker (`public/sw.js`) with `push` and `notificationclick` handlers, registered in `main.tsx`.
- Generate VAPID key pair; private key stored as a secret, public key used client-side.
- New `push_subscriptions` table (user_id, endpoint, keys, device label, platform, created_at).
- Permission UX: a "Enable notifications" toggle in Account and Admin > Settings > Notifications, never an auto-prompt on first load. On iOS, show install-first guidance when not in standalone mode.
- New edge function `send-push` that signs VAPID requests and delivers to stored endpoints, cleaning up expired ones (410/404).

### Phase 3 — Event wiring
- Staff/admin pushes: new online order, POS order completed on another device, low-stock threshold crossed, new contact message, credit due reminder.
- Customer pushes: order confirmed, order status changed (packed / out for delivery / delivered), gift voucher received, abandoned-cart nudge (optional).
- Per-user preferences table so each staff member and customer picks which categories to receive.

### Phase 4 — Reliability and polish
- Delivery log table with status, plus retry for transient failures.
- Notification grouping/tags so repeated order alerts replace rather than stack.
- Admin test-send button per device.
- Optional: scheduled digests (daily sales summary at closing time) via a cron-triggered function.

## Technical details

- Push transport: standard Web Push protocol with VAPID from a Supabase edge function (no Firebase account needed; FCM is reached through the standard endpoint automatically).
- Service worker scope `/`; keep it minimal (push handling only) so the earlier decision to skip offline caching stays intact.
- iOS requires `display: standalone` (already set) and a user gesture to call `Notification.requestPermission()`.
- Subscriptions are per device+browser, so one user can have several rows; the settings screen lists and revokes them individually, mirroring the existing Active Sessions UI.

## Suggested order

Phase 1 first (immediate value, no platform risk), then Phase 2 + 3 together for real device notifications, Phase 4 once volume justifies it.
