

## Plan: Admin Settings — Website Content Customization

### Problem
All website text (hero headline, tagline, feature descriptions, about page, footer contact info, newsletter section) is hardcoded. The admin has no way to update it without code changes.

### Solution
Add a new **"Website Content"** tab in the Settings page where admins can edit key text blocks that appear on the public site. Store these in a new `website_content` table.

### Editable Content Fields

| Key | Default | Used On |
|-----|---------|---------|
| `hero_subtitle` | "Premium Bedding & Home Decor" | Home hero |
| `hero_title` | "Comfort Meets Elegance" | Home hero |
| `hero_description` | "Discover handcrafted bedding..." | Home hero |
| `feature_1_title` / `feature_1_desc` | "Free Delivery in Kigali" / "On orders above 50,000 RWF" | Home features |
| `feature_2_title` / `feature_2_desc` | "Quality Guaranteed" / "30-day return policy" | Home features |
| `feature_3_title` / `feature_3_desc` | "Sustainably Made" / "Eco-friendly materials" | Home features |
| `newsletter_title` / `newsletter_desc` | "Stay in the Loop" / "Subscribe for exclusive..." | Home newsletter |
| `about_title` / `about_description` | "Crafted with Love in Rwanda" / story text | About page |
| `footer_description` | "Premium bedding & home decor..." | Footer |

### Implementation Steps

**1. Database migration** — Create `website_content` table:
- Columns: `id`, `content_key` (unique text), `content_value` (text), `updated_at`
- RLS: anyone can SELECT (public site needs it), only admin can UPDATE/INSERT
- Seed with default values matching current hardcoded text

**2. New Settings tab** — Add a "Website" tab (`<Globe>` icon) in `Settings.tsx`:
- Fetch all rows from `website_content`
- Group fields into sections (Hero, Features, Newsletter, About, Footer)
- Each field as a labeled Input or Textarea
- Save button updates all changed rows

**3. Update public pages** — Modify `Home.tsx`, `About.tsx`, `Footer.tsx`:
- Create a shared hook `useWebsiteContent()` that fetches all content keys with react-query and caching
- Replace hardcoded strings with content from the hook, falling back to current defaults
- Use `get_public_website_content()` security-definer function (like `get_public_business_settings`) to bypass RLS for anonymous visitors

**4. Security-definer function** — So unauthenticated visitors can read content:
```sql
CREATE FUNCTION get_public_website_content()
RETURNS TABLE(content_key text, content_value text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT content_key, content_value FROM website_content; $$;
```

### Technical Details
- Hook returns a `Record<string, string>` map for easy access: `content.hero_title ?? "Comfort Meets Elegance"`
- react-query `staleTime: 5 min` to avoid refetching on every navigation
- No schema changes to existing tables

### Files Changed
- **New migration**: `website_content` table + RLS + seed + security-definer function
- **New hook**: `src/hooks/useWebsiteContent.ts`
- **Edit**: `src/pages/admin/Settings.tsx` — add "Website" tab
- **Edit**: `src/pages/Home.tsx` — use dynamic content
- **Edit**: `src/pages/About.tsx` — use dynamic content
- **Edit**: `src/components/layout/Footer.tsx` — use dynamic content

