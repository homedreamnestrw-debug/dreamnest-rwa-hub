import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://dreamnestrw.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_URLS: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/gift-vouchers", changefreq: "monthly", priority: "0.6" },
  { path: "/cart", changefreq: "monthly", priority: "0.4" },
  { path: "/auth/login", changefreq: "yearly", priority: "0.3" },
  { path: "/auth/signup", changefreq: "yearly", priority: "0.3" },
  { path: "/auth/forgot-password", changefreq: "yearly", priority: "0.2" },
];

function escapeXml(str: string) {
  return str.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: products } = await supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);

    const urls: string[] = [];

    for (const u of STATIC_URLS) {
      urls.push(
        `  <url>\n    <loc>${SITE_URL}${u.path}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      );
    }

    for (const p of products ?? []) {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : "";
      urls.push(
        `  <url>\n    <loc>${SITE_URL}/product/${escapeXml(p.slug)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`Error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});
