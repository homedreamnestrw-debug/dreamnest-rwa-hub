// AI text generation via Lovable AI Gateway (Gemini models) — multilingual
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

type Lang = "en" | "fr" | "rw";

const SYSTEM_PROMPTS: Record<Lang, (brand: string) => string> = {
  en: (brand) =>
    `You are a copywriter for ${brand}, a premium bedding and home decor brand in Rwanda. Write in English. Use a warm, cozy, aspirational tone. Position products as transforming spaces into sanctuaries. Never use the word handcrafted.`,
  fr: (brand) =>
    `Tu es un copywriter pour ${brand}, une marque premium de literie et décoration intérieure au Rwanda. Écris en français. Utilise un ton chaleureux, cosy et aspirationnel. Présente les produits comme transformant les espaces en sanctuaires. N'utilise jamais le mot artisanal.`,
  rw: (brand) =>
    `Uri umwanditsi wa ${brand}, ikigo gikora imicandio y'ibitanda n'iyongerera mu rugo mu Rwanda. Andika mu Kinyarwanda. Koresha ijwi ryihangane, riryoheye kandi rishimishije. Erekana ko ibicuruzwa bigurisha bishobora guhindura aho utuye mu ngo nziza. Ntukoresha ijambo handcraft.`,
};

const HASHTAG_HINTS: Record<Lang, string> = {
  en: "Use English hashtags. Mix in: #DreamNest #LuxuryBedding #HomeDecor #KigaliDecor #RwandaHome",
  fr: "Utilise des hashtags français. Inclure : #DreamNest #LiterieRwanda #DecorMaisonKigali #MaisonRwanda #LiterieDeQualite #KigaliDecor",
  rw: "Koresha hashtags z'Ikinyarwanda. Hashyiremo: #DreamNest #Amashukameza #Uburiribwiza #KigaliDecor #RwandaHome #Icyumbacyiza",
};

const CAPTION_INSTRUCTIONS: Record<Lang, string> = {
  en: `Write ONE caption (max 4 short lines + 5–8 hashtags). Include the price. Return ONLY the caption text — no preamble, no quotes.`,
  fr: `Rédige UNE légende (max 4 lignes courtes + 5–8 hashtags). Inclure le prix. Retourne UNIQUEMENT le texte de la légende — sans préambule, sans guillemets.`,
  rw: `Andika INSANGANYAMATSIKO IMWE (binyuranye n'imirongo 4 migufi + hashtags 5–8). Shyiramo igiciro. Subiza GUSA umwandiko w'insanganyamatsiko — nta mvugiro, nta tugemu.`,
};

const DESCRIPTION_INSTRUCTIONS: Record<Lang, string> = {
  en: `Write a polished product description (90–130 words). Mention materials/comfort/use-cases when relevant. End with a short call-to-action sentence. Return ONLY the description — no headings, no markdown, plain prose.`,
  fr: `Rédige une description de produit soignée (90–130 mots). Mentionne les matériaux, le confort et les usages quand c'est pertinent. Termine par une courte phrase d'appel à l'action. Retourne UNIQUEMENT la description — sans titres, sans markdown, en prose simple.`,
  rw: `Andika incamake y'igicuruzwa nziza (amagambo 90–130). Vuga ibikoresho, ubworoherane n'aho bikoreshwa iyo bikwiriye. Sozanya n'interuro ngufi ihamagarira gukora. Subiza GUSA incamake — nta mitwe, nta markdown, mu nyandiko isanzwe.`,
};

const POLISH_INSTRUCTIONS: Record<Lang, string> = {
  en: `Polish and improve the following product description while preserving its meaning. Fix grammar, improve flow, make it warm and aspirational. Keep length similar (90–130 words). Return ONLY the polished description — no headings, no markdown.`,
  fr: `Améliore et peaufine la description de produit suivante en préservant son sens. Corrige la grammaire, améliore le style, rends-la chaleureuse et inspirante. Garde une longueur similaire (90–130 mots). Retourne UNIQUEMENT la description peaufinée — sans titres, sans markdown.`,
  rw: `Nozeza kandi utunganye incamake y'igicuruzwa ikurikira ariko ugumane icyo ivuga. Kosora imyandikire, unozeze imvugo, uyigire iryoshye kandi ishimishije. Komeza uburebure busa (amagambo 90–130). Subiza GUSA incamake yanozejwe — nta mitwe, nta markdown.`,
};

const SHORTEN_INSTRUCTIONS: Record<Lang, string> = {
  en: `Shorten the following product description to 30–50 words while keeping the key selling points and warm tone. End with a short call-to-action. Return ONLY the shortened description — no headings, no markdown.`,
  fr: `Raccourcis la description de produit suivante à 30–50 mots en gardant les arguments clés et le ton chaleureux. Termine par un court appel à l'action. Retourne UNIQUEMENT la description raccourcie — sans titres, sans markdown.`,
  rw: `Gabanya incamake y'igicuruzwa ikurikira igere ku magambo 30–50 ariko ugumane ingingo z'ingenzi n'ijwi ryiza. Soza n'interuro ngufi ihamagarira gukora. Subiza GUSA incamake ngufi — nta mitwe, nta markdown.`,
};

const NAME_INSTRUCTIONS: Record<Lang, string> = {
  en: `Suggest a single short, catchy product name (2–5 words) based on the description below. Return ONLY the name — no quotes, no punctuation at end, no preamble.`,
  fr: `Propose UN seul nom de produit court et accrocheur (2–5 mots) basé sur la description ci-dessous. Retourne UNIQUEMENT le nom — sans guillemets, sans ponctuation finale, sans préambule.`,
  rw: `Tanga izina RIMWE rigufi kandi rishimishije ry'igicuruzwa (amagambo 2–5) rishingiye ku ncamake ikurikira. Subiza GUSA izina — nta tugemu, nta kamenyetso ku iherezo, nta mvugiro.`,
};

function buildPrompt(opts: {
  mode: "caption" | "description" | "polish" | "shorten" | "name";
  lang: Lang;
  brandName: string;
  product: any;
  captionType?: string;
  salePct?: number;
  text?: string;
}) {
  const { mode, lang, brandName, product, captionType, salePct, text } = opts;
  const system = SYSTEM_PROMPTS[lang](brandName);

  if (mode === "caption") {
    const type = captionType || "general";
    const pct = salePct ?? 10;
    const user = `${CAPTION_INSTRUCTIONS[lang]}
${HASHTAG_HINTS[lang]}

Product: ${product.name}
Price: ${product.price} RWF
Caption type: ${type}${type === "sale" ? ` (discount ${pct}%)` : ""}`;
    return { system, user };
  }

  if (mode === "polish") {
    const user = `${POLISH_INSTRUCTIONS[lang]}

Existing description:
${text ?? ""}`;
    return { system, user };
  }

  if (mode === "shorten") {
    const user = `${SHORTEN_INSTRUCTIONS[lang]}

Existing description:
${text ?? ""}`;
    return { system, user };
  }

  if (mode === "name") {
    const user = `${NAME_INSTRUCTIONS[lang]}

Description:
${text ?? ""}
${product?.category ? `Category: ${product.category}` : ""}`;
    return { system, user };
  }

  // description
  const attrs = product?.attributes && typeof product.attributes === "object"
    ? Object.entries(product.attributes)
        .filter(([k, v]) => k && v != null && String(v).trim() !== "")
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")
    : "";
  const attrsBlock = attrs
    ? `\n\nProduct attributes (MUST be naturally mentioned in the description):\n${attrs}`
    : "";
  const user = `${DESCRIPTION_INSTRUCTIONS[lang]}

Name: ${product.name}
${product.category ? `Category: ${product.category}` : ""}
${product.price ? `Price: ${product.price} RWF` : ""}${attrsBlock}`;
  return { system, user };
}

async function callAI(apiKey: string, system: string, user: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    const err: any = new Error(`AI ${r.status}: ${t}`);
    err.status = r.status;
    throw err;
  }
  const data = await r.json();
  return ((data?.choices?.[0]?.message?.content ?? "") as string).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const {
      mode,
      product,
      captionType,
      salePct,
      brand,
      language,
      languages,
      text: inputText,
    } = body as {
      mode: "caption" | "description" | "polish" | "shorten" | "name";
      product?: any;
      captionType?: string;
      salePct?: number;
      brand?: string;
      language?: Lang;
      languages?: Lang[];
      text?: string;
    };

    const VALID_MODES = ["caption", "description", "polish", "shorten", "name"];
    if (!mode || !VALID_MODES.includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((mode === "caption" || mode === "description") && !product?.name) {
      return new Response(JSON.stringify({ error: "product.name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((mode === "polish" || mode === "shorten" || mode === "name") && !inputText?.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = brand || "DreamNest";
    const validLangs: Lang[] = ["en", "fr", "rw"];

    // Batch mode: generate all requested languages in parallel
    if (Array.isArray(languages) && languages.length > 0) {
      const langs = languages.filter((l): l is Lang => validLangs.includes(l));
      try {
        const results = await Promise.all(
          langs.map(async (lang) => {
            const { system, user } = buildPrompt({
              mode,
              lang,
              brandName,
              product,
              captionType,
              salePct,
              text: inputText,
            });
            const text = await callAI(apiKey, system, user);
            return [lang, text] as const;
          }),
        );
        const texts: Record<string, string> = {};
        for (const [l, t] of results) texts[l] = t;
        return new Response(JSON.stringify({ texts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        const status = e?.status === 429 || e?.status === 402 ? e.status : 502;
        const msg =
          e?.status === 429
            ? "Rate limit reached, please try again shortly."
            : e?.status === 402
              ? "AI credits exhausted. Add funds in Lovable workspace settings."
              : e?.message || "AI error";
        return new Response(JSON.stringify({ error: msg }), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Single-language mode
    const lang: Lang = validLangs.includes(language as Lang) ? (language as Lang) : "en";
    const { system, user } = buildPrompt({
      mode,
      lang,
      brandName,
      product,
      captionType,
      salePct,
      text: inputText,
    });

    try {
      const text = await callAI(apiKey, system, user);
      return new Response(JSON.stringify({ text, language: lang }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      console.error("AI gateway error:", e?.status, e?.message);
      if (e?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (e?.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: e?.message || "AI error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("gemini-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
