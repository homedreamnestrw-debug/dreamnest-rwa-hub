// PhotoRoom background removal with cutout caching.
// 1. Checks cache (studio-cutouts private bucket) by productId + image hash.
// 2. If missing, calls PhotoRoom /v1/segment (compressed WebP w/ alpha, medium size).
// 3. Stores cutout in studio-cutouts (cache) and product-images/cutouts (public URL).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(input: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

function nextMonthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.slice(7));
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub as string;
    const [{ data: isAdmin }, { data: isStaff }] = await Promise.all([
      userClient.rpc("has_role", { _user_id: uid, _role: "admin" }),
      userClient.rpc("has_role", { _user_id: uid, _role: "staff" }),
    ]);
    if (!isAdmin && !isStaff) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const imageUrl = body?.imageUrl;
    const productId = typeof body?.productId === "string" && /^[\w-]{1,64}$/.test(body.productId)
      ? body.productId : "unassigned";
    const force = body?.force === true;
    if (typeof imageUrl !== "string" || !/^https:\/\//.test(imageUrl) || imageUrl.length > 2000) {
      return json({ error: "Valid https imageUrl is required" }, 400);
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return json({ fallback: true, reason: "storage_unavailable", url: imageUrl });
    const admin = createClient(url, serviceKey);
    const path = `${productId}/${await sha(imageUrl)}.webp`;
    const publicPath = `cutouts/${path}`;
    const publicUrl = admin.storage.from("product-images").getPublicUrl(publicPath).data.publicUrl;

    if (!force) {
      const { data: cached } = await admin.storage.from("studio-cutouts").download(path);
      if (cached) {
        // Make sure public copy exists
        await admin.storage.from("product-images").upload(publicPath, cached, {
          contentType: "image/webp", upsert: true,
        });
        return json({ url: publicUrl, cached: true });
      }
    }

    const apiKey = Deno.env.get("PHOTOROOM_API_KEY");
    if (!apiKey) return json({ fallback: true, reason: "not_configured", url: imageUrl });

    const src = await fetch(imageUrl);
    if (!src.ok) return json({ fallback: true, reason: "source_unreachable", url: imageUrl });
    const srcBlob = await src.blob();

    const form = new FormData();
    form.append("image_file", srcBlob, "image");
    form.append("format", "webp");
    form.append("size", "medium");
    const pr = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
    });
    if (pr.status === 402 || pr.status === 429) {
      return json({ fallback: true, reason: "limit_reached", resetsOn: nextMonthStart(), url: imageUrl });
    }
    if (!pr.ok) {
      console.error("PhotoRoom error", pr.status, await pr.text().catch(() => ""));
      return json({ fallback: true, reason: "api_error", url: imageUrl });
    }
    const out = new Uint8Array(await pr.arrayBuffer());
    await Promise.all([
      admin.storage.from("studio-cutouts").upload(path, out, { contentType: "image/webp", upsert: true }),
      admin.storage.from("product-images").upload(publicPath, out, { contentType: "image/webp", upsert: true }),
    ]);
    return json({ url: publicUrl, cached: false, bytes: out.byteLength });
  } catch (e) {
    console.error(e);
    return json({ fallback: true, reason: "error" }, 200);
  }
});
