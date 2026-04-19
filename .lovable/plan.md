
## Goal
Naturally weave Rwanda/Kigali-focused SEO keywords into existing page copy and meta tags so search rankings improve without making the content feel stuffed or robotic.

## Target Keywords
- bedding Kigali
- home decor Rwanda / home decor Kigali
- premium bedding Rwanda
- bedroom sets Kigali
- storage box Kigali
- pillows Kigali

## Where to add them

### 1. `index.html` (default meta)
Update the default `<title>` and `<meta name="description">` plus OG/Twitter descriptions to include "Kigali, Rwanda" and 2–3 core keywords. This is the fallback for crawlers before React renders.

### 2. `src/pages/Home.tsx`
- **SEO title/description**: Expand to include "bedding Kigali" and "home decor Rwanda".
- **Hero subtitle fallback**: Already says "Premium Bedding & Home Decor" — extend default fallback to "Premium Bedding & Home Decor in Kigali, Rwanda" (only when DB content is empty, so admin overrides remain respected).
- **Features section fallback copy**: Mention Kigali delivery naturally.
- **Newsletter fallback copy**: Mention Rwanda.
- Add a short intro paragraph above the Categories section: "From premium bedding and bedroom sets to pillows, storage boxes and home decor — discover pieces curated for homes across Kigali and Rwanda." (only renders as static copy, helps crawlers).

### 3. `src/pages/Shop.tsx`
- SEO title: "Shop Premium Bedding & Home Decor in Kigali, Rwanda | DreamNest"
- SEO description: include "bedding Kigali", "bedroom sets", "pillows", "storage boxes", "home decor Rwanda".
- Add a small intro paragraph under the page heading describing the catalog with keywords woven in.

### 4. `src/pages/About.tsx`
- SEO title/description: include "premium bedding Rwanda" and "Kigali".
- Adjust default fallback of `about_description` to mention "premium bedding and home decor in Kigali, Rwanda" (only the default — admin-edited content still wins).

### 5. `src/pages/Contact.tsx`
- SEO title/description: "Contact DreamNest — Bedding & Home Decor Store in Kigali, Rwanda".
- Ensure address line emphasizes Kigali (already does).

### 6. `src/pages/ProductDetail.tsx`
- Append " — Kigali, Rwanda" to SEO title and include "premium bedding Kigali / home decor Rwanda" in the description template.

### 7. `src/components/layout/Footer.tsx`
- Default fallback for `footer_description` already mentions Kigali. Extend slightly: "Premium bedding, bedroom sets, pillows, storage boxes and home decor — crafted with care in Kigali, Rwanda." (default fallback only.)

### 8. `src/components/SEO.tsx`
- Add an optional `keywords` prop that renders `<meta name="keywords" content="...">`. Pass Rwanda/Kigali keyword sets per page. (Modern SEO weights this lightly, but it's harmless and useful for some regional engines.)

## Principles
- All admin-editable content (`useWebsiteContent` values) is left intact — only the **fallback defaults** are enriched, so the admin can still override.
- Keywords are added in natural sentences, never as comma-separated stuffing in body copy.
- No layout, design, or behavior changes.

## Files to edit
- `index.html`
- `src/components/SEO.tsx`
- `src/pages/Home.tsx`
- `src/pages/Shop.tsx`
- `src/pages/About.tsx`
- `src/pages/Contact.tsx`
- `src/pages/ProductDetail.tsx`
- `src/components/layout/Footer.tsx`
