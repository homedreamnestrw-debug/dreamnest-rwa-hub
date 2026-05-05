// Gemini text generation edge function (uses user's GEMINI_API_KEY)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gemini-2.0-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const { mode, product, captionType, salePct, brand } = await req.json();

    if (!mode || !product?.name) {
      return new Response(JSON.stringify({ error: "mode and product.name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = brand || "DreamNest";
    let prompt = "";

    if (mode === "caption") {
      const type = captionType || "general";
      const pct = salePct ?? 10;
      prompt = `You write social media captions for ${brandName} — a premium bedding & home decor boutique in Kigali, Rwanda. Currency is RWF.

Write ONE caption (max 4 short lines + 5-8 hashtags) for this product.
Tone: warm, elegant, sensorial. No emojis overload (max 2). Include price.

Product: ${product.name}
Price: ${product.price} RWF
Caption type: ${type}${type === "sale" ? ` (discount ${pct}%)` : ""}

Return ONLY the caption text — no preamble, no quotes.`;
    } else if (mode === "description") {
      prompt = `You write product descriptions for ${brandName} — a premium bedding & home decor store in Kigali, Rwanda.

Write a polished product description (90-130 words) for:
Name: ${product.name}
${product.category ? `Category: ${product.category}` : ""}
${product.price ? `Price: ${product.price} RWF` : ""}

Style: warm, sensorial, benefit-led. Mention materials/comfort/use-cases when relevant. End with a short call-to-action sentence.
Return ONLY the description — no headings, no markdown, plain prose.`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 400 },
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("Gemini error:", r.status, t);
      return new Response(JSON.stringify({ error: `Gemini ${r.status}: ${t}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("").trim() || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
