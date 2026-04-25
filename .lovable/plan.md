## Plan: Creative Studio — Phase 1 + Announcements

A new admin-only module at `/admin/creative-studio` that turns DreamNest catalog data into branded social graphics, announcements, captions, and shareable assets — entirely client-side using **Konva**, with history persisted to Supabase.

---

### 1. Routing, sidebar, permissions

- Add route `/admin/creative-studio` in `src/App.tsx` under the `AdminLayout` block, wrapped with `ProtectedRoute requiredRole="staff"` (so admins + staff get access).
- Add a new sidebar group **"Studio"** in `AdminSidebar.tsx` with a single entry **Creative Studio** (icon: `Sparkles` from lucide), visibility `both`.

### 2. Database (Supabase migration)

Two new tables behind RLS:

**`creative_assets`** — log of every generated card
| column | type |
|---|---|
| id | uuid PK |
| created_by | uuid (auth.uid) |
| created_at | timestamptz |
| asset_type | text — `'product_card' \| 'announcement' \| 'bundle'` |
| product_id | uuid (nullable, FK by id reference only — no cascade) |
| template_key | text — e.g. `we_are_open`, `flash_sale`, `restock` |
| style_variant | text — `classic / bold / minimal / cozy / urgent` |
| platform_format | text — `ig_post / ig_story / whatsapp / fb_post` |
| config | jsonb — full overlay/font/color state for one-click regenerate |
| caption | text |
| download_count | int default 0 |

**`creative_performance`** — manual post-engagement notes
| column | type |
|---|---|
| id, created_at, created_by | standard |
| asset_id | uuid → creative_assets.id |
| platform | text — `instagram / tiktok / facebook / whatsapp` |
| posted_at | date |
| likes, comments, shares, sales_attributed | int |
| notes | text |

RLS for both: `admin/staff can manage`, no public read.

(Performance table is created now even though the dashboard ships later — keeps schema stable.)

### 3. Dependencies

- `konva` + `react-konva` — declarative canvas
- `use-image` — Konva image hook for product/logo loading with CORS handling
- `jszip` + `file-saver` — multi-file downloads (price list + future story zip)

### 4. File structure

```
src/pages/admin/CreativeStudio.tsx              ← main page
src/components/admin/studio/
  ├── ProductPicker.tsx                         ← grid w/ search + filter, lazy images
  ├── StyleControls.tsx                         ← font / color / overlay / position controls
  ├── OverlayToggles.tsx                        ← name / price / badges / SKU / URL / logo
  ├── PlatformFormatTabs.tsx                    ← IG post / IG story / WhatsApp / FB
  ├── CardPreview.tsx                           ← Konva Stage at format dimensions
  ├── VariationGrid.tsx                         ← all 5 styles as scaled thumbnails
  ├── CaptionPanel.tsx                          ← auto-generated caption + hashtags + copy
  ├── ExportBar.tsx                             ← PNG / JPG / clipboard / WhatsApp share
  ├── AnnouncementsPanel.tsx                    ← template library tab
  └── templates/
      ├── productCardRenderers.ts               ← 5 style render functions (Konva nodes)
      ├── announcementRenderers.ts              ← 19 templates → Konva nodes
      ├── brandTokens.ts                        ← colors, fonts, dimensions, format presets
      └── captionTemplates.ts                   ← caption generators by post type
src/hooks/useBrandAssets.ts                     ← loads logo from business_settings, fallback /logo.png
src/hooks/useCreativeHistory.ts                 ← list + insert into creative_assets
```

### 5. Brand tokens (`brandTokens.ts`)

```ts
export const COLORS = {
  warmWhite:  '#FAFAF8',
  cream:      '#F5F0E8',
  terracotta: '#C17A5A',
  taupe:      '#8B7355',
  charcoal:   '#2C2C2A',
  dustyRose:  '#D4A5A0',
  forest:     '#4A6B52',
  midnight:   '#1F2A44',
};
export const FONTS = {
  serif:    "'Playfair Display', serif",
  sans:     "'Inter', sans-serif",
  display:  "'Inter', sans-serif",   // bold weight
  script:   "'Dancing Script', cursive",
  editorial:"'Playfair Display', serif",
};
export const FORMATS = {
  ig_post:   { w: 1080, h: 1080, label: 'Instagram Post' },
  ig_story:  { w: 1080, h: 1920, label: 'IG Story / TikTok' },
  whatsapp:  { w:  800, h:  800, label: 'WhatsApp Catalogue' },
  fb_post:   { w: 1200, h:  630, label: 'Facebook Post' },
};
export const TAGLINE = 'Sweet dreams start with the perfect bedding...';
```

Google Fonts loaded via `<link>` injected from `index.html` so Konva text rasterizes with the right typeface.

### 6. Section 1 — Product card generator

**ProductPicker** queries `products` (active only) joined to `categories`, with search + category filter + lazy thumbnails. Selecting a product hydrates a `useStudio()` zustand-light state (just `useState` in the page) with: image, name, description (first 80 chars), price (RWF), SKU, stock, category, low_stock_threshold.

**CardPreview** renders a Konva `Stage` sized to the active platform format, then scales the canvas via CSS transform to fit the panel. Layers:
1. Background (color or product image w/ overlay)
2. Color overlay rect with configurable opacity (0–80%)
3. Logo image at chosen corner
4. Product name (font + position)
5. Price (RWF formatted, position complementary to text block)
6. Optional badges (New / Best Seller / Sale %, Low Stock auto-from `stock_quantity ≤ low_stock_threshold`)
7. Optional SKU, description excerpt
8. Footer: `dreamnestrw.com` watermark

**5 style renderers** (`productCardRenderers.ts`) export `(ctx) => KonvaNodes[]` returning a configured layer stack for: classic / bold / minimal / cozy / urgent. Urgent reads live `stock_quantity` for the "Only X left!" badge.

**VariationGrid** mounts 5 small Stages (preview-scaled) so all styles render simultaneously; clicking promotes one to the main preview.

### 7. Section 2 — Announcements library

`AnnouncementsPanel` shows a card grid of 19 templates (8 business + 7 seasonal + 4 engagement). Selecting one opens a right-side form with only the fields that template needs (e.g. `Flash Sale` → percent, duration, product picker). Renders into the same `CardPreview` using `announcementRenderers.ts`. The product-pull templates (New Arrival, Restock, Customer Spotlight) reuse `ProductPicker` inline.

### 8. Section 3 — Style engine

`StyleControls` exposes:
- Font dropdown (5 options from `FONTS`)
- Color shade dropdown (6 from `COLORS`)
- Overlay opacity slider (0–80)
- Logo position (4 corners + center) — radio
- Text position (top / center / bottom) — radio

All controls feed the renderer via a single `StyleConfig` object. Changes re-render Konva immediately (memoized).

### 9. Section 6 — Export & sharing

`ExportBar`:
- **Download PNG** — `stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' })` then anchor download.
- **Download JPG** — `mimeType: 'image/jpeg', quality: 0.9`.
- **Copy to clipboard** — converts to Blob and uses `navigator.clipboard.write([new ClipboardItem({...})])`.
- **Share via WhatsApp** — opens `https://wa.me/?text=<encoded caption with dreamnestrw.com link>`.
- Every download/share also calls `useCreativeHistory.log(...)` to insert into `creative_assets` with the full `config` for one-click regenerate later.

`CaptionPanel` uses `captionTemplates.ts` to produce captions per post type (launch / sale / restock / general) with hashtags `#DreamNest #BedroomRwanda #HomeDecorKigali #PremiumBedding #KigaliHome #RwandaDecor`. Includes a "Copy caption" button.

### 10. Brand asset loader

`useBrandAssets.ts` queries `get_public_business_settings()` (already exists) for `logo_url`. If null/empty or load fails, fall back to `/logo.png`. Returns an `HTMLImageElement` ready for Konva.

### 11. UI layout

- Tabs at top: **Product Cards** | **Announcements**
- Left panel (30%): picker + StyleControls + OverlayToggles + format tabs + Generate
- Right panel (70%): VariationGrid (5 thumbnails) above, expanded CardPreview below, ExportBar + CaptionPanel beneath
- Fully responsive: on `<lg` viewports the panels stack vertically, canvas scales down proportionally

### 12. Out of scope for this build (deferred)

The following from the original brief are **explicitly not built now** and can be added in a follow-up:

- Bundle "Complete the Look" multi-product card
- Section 4 — Price List Generator
- Section 5 — Story Sequence Builder (3-frame zip)
- Section 7 — Post History UI + Performance dashboard + recommendations  
  *(the underlying tables ARE created so the future build is just UI on top)*

### Files

**New**
- `src/pages/admin/CreativeStudio.tsx`
- `src/components/admin/studio/ProductPicker.tsx`
- `src/components/admin/studio/StyleControls.tsx`
- `src/components/admin/studio/OverlayToggles.tsx`
- `src/components/admin/studio/PlatformFormatTabs.tsx`
- `src/components/admin/studio/CardPreview.tsx`
- `src/components/admin/studio/VariationGrid.tsx`
- `src/components/admin/studio/CaptionPanel.tsx`
- `src/components/admin/studio/ExportBar.tsx`
- `src/components/admin/studio/AnnouncementsPanel.tsx`
- `src/components/admin/studio/templates/productCardRenderers.ts`
- `src/components/admin/studio/templates/announcementRenderers.ts`
- `src/components/admin/studio/templates/brandTokens.ts`
- `src/components/admin/studio/templates/captionTemplates.ts`
- `src/hooks/useBrandAssets.ts`
- `src/hooks/useCreativeHistory.ts`
- Migration: `creative_assets` + `creative_performance` tables with RLS

**Edited**
- `src/App.tsx` — add `/admin/creative-studio` route
- `src/components/admin/AdminSidebar.tsx` — add Studio group
- `index.html` — preload Playfair Display, Inter, Dancing Script from Google Fonts
- `package.json` — add `konva`, `react-konva`, `use-image`, `jszip`, `file-saver`