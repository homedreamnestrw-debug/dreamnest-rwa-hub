# Plan: Mobile PWA Optimization + Install Prompt

## Scope

Mobile polish for the already-installable DreamNest PWA, plus a custom "Install app" popup. No service worker, no offline caching, no push notifications.

## 1. Install prompt popup

New component `src/components/InstallPrompt.tsx`, mounted once in `src/App.tsx`.

Behavior:
- Listens for the browser `beforeinstallprompt` event (Android / Chrome / Edge), stores it, and shows a bottom-sheet card: DreamNest icon, "Install DreamNest", short line ("Add to your home screen for faster shopping"), Install + Not now buttons.
- Install button calls the stored prompt and logs the outcome; card dismisses either way.
- iOS Safari has no `beforeinstallprompt`, so on iOS we detect Safari + non-standalone and show instructions instead: "Tap Share, then Add to Home Screen" with the share glyph.
- Never shows when already running standalone (`display-mode: standalone` or `navigator.standalone`).
- Dismissal is remembered in `localStorage` for 14 days; also suppressed on `/admin*` routes so it doesn't interrupt POS.
- Appears only after a short delay (about 5s) so it doesn't cover first paint.
- Styled with existing semantic tokens (warm-brown primary, soft-gold accent, Playfair heading).

## 2. Mobile PWA optimization

`index.html`:
- Add `viewport-fit=cover` to the viewport meta so the app uses the full screen on notched phones.
- Add `mobile-web-app-capable` alongside the existing Apple tag.
- Set the Apple status bar style to a value matching the warm-brown theme.
- Add a `theme-color` variant for dark scheme.

`src/index.css`:
- Safe-area padding utilities (`env(safe-area-inset-*)`) applied to the sticky header and the fixed WhatsApp button so they clear the notch and home indicator.
- Prevent iOS input auto-zoom by ensuring form inputs are at least 16px on small screens.
- Disable overscroll bounce/pull-to-refresh chrome on the app shell and set `-webkit-tap-highlight-color: transparent`.

`public/manifest.webmanifest`:
- Add `shortcuts` for Shop, Cart, and Admin POS (long-press app icon actions).
- Add `categories` and `id` fields.

## Files

| File | Action |
|------|--------|
| `src/components/InstallPrompt.tsx` | Create |
| `src/App.tsx` | Mount InstallPrompt |
| `index.html` | Viewport + mobile meta tags |
| `src/index.css` | Safe-area, tap, input-zoom rules |
| `public/manifest.webmanifest` | Shortcuts, id, categories |

## Notes

- The native install banner only fires on supported browsers over HTTPS; in the Lovable editor preview (iframe) it will not fire, so the popup is best verified on the published URL from a phone.
- No changes to business logic, data, or admin behavior.
