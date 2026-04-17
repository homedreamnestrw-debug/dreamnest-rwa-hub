

Looking at the inventory list, I need to group these 14 items into logical, customer-friendly categories that fit DreamNest's "Premium Bedding & Home Decor" brand.

**Items to group:**
1. Bedsheets with duvet cover
2. Throw pillow
3. Pillows
4. Duvets
5. Bathrobe
6. Towels
7. Hair Towels
8. Throw Blanket
9. Mattress Topper
10. Storage Humper (hamper)
11. Storage Rack
12. Storage boxes
13. Laundry Humper (hamper)
14. Disposable towels

## Proposed Categories (4 categories)

### 1. Bedding
Core sleep essentials — what goes on the bed.
- Bedsheets with duvet cover
- Duvets
- Pillows
- Mattress Topper

### 2. Throws & Cushions
Decorative soft layers that add warmth and style.
- Throw pillow
- Throw Blanket

### 3. Bath & Body
Everything for the bathroom and personal care.
- Bathrobe
- Towels
- Hair Towels
- Disposable towels

### 4. Storage & Organization
Tidy-up essentials for bedroom, bathroom, and laundry.
- Storage Hamper
- Storage Rack
- Storage Boxes
- Laundry Hamper

---

## Alternative: 5-Category Split

If you'd prefer finer granularity, split Bath & Body into two:

- **Bath Linens** — Towels, Hair Towels, Disposable Towels
- **Robes & Loungewear** — Bathrobe (room to grow with slippers, pajamas, etc.)

---

## Suggested Slugs (for URLs & seeding)

| Category | Slug |
|---|---|
| Bedding | `bedding` |
| Throws & Cushions | `throws-cushions` |
| Bath & Body | `bath-body` |
| Storage & Organization | `storage-organization` |

Note: `bedding` and `bath-body` already have hero images mapped in `src/lib/categoryImages.ts`. The two new ones (`throws-cushions`, `storage-organization`) would need images added — or we can reuse `home-decor.jpg` and `bedroom-essentials.jpg` as fallbacks.

---

## Next Step Options

If you approve, I can:
- **Seed these categories** into the database via migration (insert into `categories` table with slugs + descriptions)
- **Add matching hero images** for the two new categories
- **Pre-create the 14 products** as inactive drafts under the right categories so you only need to add prices, SKUs, and photos

Let me know which option(s) you want and I'll proceed.

