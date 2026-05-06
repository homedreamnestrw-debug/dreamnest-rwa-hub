// AI text generation via Lovable AI Gateway (Gemini models)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const { mode, product, captionType, salePct, brand } = await req.json();

    if (!mode || !product?.name) {
      return new Response(JSON.stringify({ error: "mode and product.name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = brand || "DreamNest";
    let userPrompt = "";
    let systemPrompt = "";

    if (mode === "caption") {
      const type = captionType || "general";
      const pct = salePct ?? 10;
      systemPrompt = `You write social media captions for ${brandName} — a premium bedding & home decor boutique in Kigali, Rwanda. Currency is RWF. Tone: warm, elegant, sensorial. Max 2 emojis.`;
      userPrompt = `Write ONE caption (max 4 short lines + 5-8 hashtags) for this product. Include price.

Product: ${product.name}
Price: ${product.price} RWF
Caption type: ${type}${type === "sale" ? ` (discount ${pct}%)` : ""}

Return ONLY the caption text — no preamble, no quotes.`;
    } else if (mode === "description") {
      systemPrompt = `You write product descriptions for ${brandName} — a premium bedding & home decor store in Kigali, Rwanda. Style: warm, sensorial, benefit-led.`;
      userPrompt = `Write a polished product description (90-130 words) for:
Name: ${product.name}
${product.category ? `Category: ${product.category}` : ""}
${product.price ? `Price: ${product.price} RWF` : ""}

Mention materials/comfort/use-cases when relevant. End with a short call-to-action sentence.
Return ONLY the description — no headings, no markdown, plain prose.`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      if (r.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (r.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: `AI ${r.status}: ${t}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const text = (data?.choices?.[0]?.message?.content ?? "").trim();

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
