# Plan: Installable App / Home Screen Icon for DreamNest

## Scope

Only installability/home-screen support. Offline caching, service workers, and push notifications are explicitly excluded.

## What Will Be Built

1. Web app manifest (`public/manifest.webmanifest`)
   - App name: "DreamNest"
   - Short name: "DreamNest"
   - Description: "Premium Bedding & Home Decor in Kigali, Rwanda"
   - Start URL: `/`
   - Scope: `/`
   - Display: `standalone`
   - Theme color: `#5D4037` (matches warm-brown primary)
   - Background color: `#FAF7F2` (matches cream background)
   - Orientation: `portrait` (or `any`)
   - Icons: 192x192, 512x512, and maskable PNGs

2. Icons under `public/icons/`
   - Generate from the DreamNest brand identity (warm-brown + soft-gold, serif logomark or monogram).
   - Formats: PNG at 192x192, 512x512, and a maskable 512x512 variant.

3. Head metadata in `index.html`
   - `<link rel="manifest" href="/manifest.webmanifest" />`
   - `<meta name="theme-color" content="#5D4037" />`
   - `<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />`
   - Favicon references for 32x32 and 16x16 PNGs.

## What Will NOT Be Built

- `vite-plugin-pwa` or any service worker.
- Offline caching or runtime caching strategies.
- Push notifications or FCM integration.
- `?sw=off` kill switch or any SW registration guard.

## Files to Edit / Create

| File | Action |
|------|--------|
| `public/manifest.webmanifest` | Create |
| `public/icons/icon-192x192.png` | Create (generate image) |
| `public/icons/icon-512x512.png` | Create (generate image) |
| `public/icons/icon-maskable-512x512.png` | Create (generate image) |
| `public/icons/apple-touch-icon.png` | Create (generate image) |
| `public/icons/favicon-32x32.png` | Create (generate image) |
| `public/icons/favicon-16x16.png` | Create (generate image) |
| `index.html` | Edit (add manifest, theme-color, apple-touch-icon, favicon tags) |

## Verification

- Build the project and confirm no build errors.
- Open the published site in Chrome/Lighthouse and verify the manifest is detected and install prompt is eligible.
- Confirm `theme-color` applies in browser toolbar on mobile.
- Confirm iOS Safari "Add to Home Screen" uses the apple-touch-icon.

## Notes

- No runtime behavior changes; this is purely app metadata and icons.
- Manifest-only installability does not require cache-busting or service workers.
- Lovable's hosting already serves HTML and control files with revalidation-friendly headers.