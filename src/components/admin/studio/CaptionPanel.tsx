import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Check, Sparkles, Loader2, Languages } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CaptionType,
  generateCaption,
} from "./templates/captionTemplates";
import { ProductData } from "./templates/productCardRenderers";
import { LanguageSelector } from "./LanguageSelector";
import {
  LANGUAGE_OPTIONS,
  StudioLanguage,
  useStudioLanguage,
} from "@/lib/studioLanguage";

interface Props {
  product: ProductData | null;
  salePct?: number;
  onCaptionChange?: (s: string) => void;
}

const TYPES: { key: CaptionType; label: string }[] = [
  { key: "general", label: "General" },
  { key: "launch", label: "Product launch" },
  { key: "sale", label: "Sale" },
  { key: "restock", label: "Restock" },
];

export function CaptionPanel({ product, salePct, onCaptionChange }: Props) {
  const [type, setType] = useState<CaptionType>("general");
  const [copied, setCopied] = useState(false);
  const [aiTexts, setAiTexts] = useState<Partial<Record<StudioLanguage, string>>>({});
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const { language, setLanguage } = useStudioLanguage();

  const templateCaption = useMemo(() => {
    if (!product) return "";
    const pct = salePct ?? 10;
    const sale = type === "sale";
    return generateCaption({
      productName: product.name,
      price: sale ? Math.round(product.price * (1 - pct / 100)) : product.price,
      originalPrice: product.price,
      discountPct: pct,
      type,
    });
  }, [product, type, salePct]);

  const activeText = aiTexts[language] ?? (Object.keys(aiTexts).length === 0 ? templateCaption : "");
  const caption = activeText;

  useEffect(() => {
    onCaptionChange?.(caption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption]);

  const generateAI = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gemini-generate", {
        body: { mode: "caption", product, captionType: type, salePct, language },
      });
      if (error) throw error;
      if (!data?.text) throw new Error("Empty response");
      setAiTexts((prev) => ({ ...prev, [language]: data.text }));
      toast({ title: "AI caption generated" });
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateAll = async () => {
    if (!product) return;
    setBatchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gemini-generate", {
        body: {
          mode: "caption",
          product,
          captionType: type,
          salePct,
          languages: ["en", "fr", "rw"],
        },
      });
      if (error) throw error;
      if (!data?.texts) throw new Error("Empty response");
      setAiTexts(data.texts);
      toast({ title: "Captions generated in 3 languages" });
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    } finally {
      setBatchLoading(false);
    }
  };

  const copy = async () => {
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    toast({ title: "Caption copied" });
    setTimeout(() => setCopied(false), 1500);
  };

  const hasMultiple = Object.keys(aiTexts).length >= 2;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex-1 min-w-[140px] space-y-1.5">
          <Label className="text-xs">Caption type</Label>
          <Select value={type} onValueChange={(v) => { setType(v as CaptionType); setAiTexts({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <LanguageSelector value={language} onChange={setLanguage} size="xs" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="default" onClick={generateAI} disabled={!product || loading || batchLoading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI ({language.toUpperCase()})
        </Button>
        <Button size="sm" variant="secondary" onClick={generateAll} disabled={!product || loading || batchLoading}>
          {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          Generate All Languages
        </Button>
        <Button size="sm" variant="outline" onClick={copy} disabled={!caption}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy
        </Button>
      </div>

      {hasMultiple ? (
        <Tabs value={language} onValueChange={(v) => setLanguage(v as StudioLanguage)}>
          <TabsList className="grid grid-cols-3">
            {LANGUAGE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="text-xs">
                {opt.flag} {opt.value.toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          {LANGUAGE_OPTIONS.map((opt) => (
            <TabsContent key={opt.value} value={opt.value} className="mt-2">
              <Textarea
                value={aiTexts[opt.value] ?? ""}
                onChange={(e) => setAiTexts((prev) => ({ ...prev, [opt.value]: e.target.value }))}
                rows={6}
                placeholder={`No ${opt.label} caption yet — click Generate All Languages.`}
                className="font-mono text-xs"
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Textarea
          value={caption}
          onChange={(e) => setAiTexts((prev) => ({ ...prev, [language]: e.target.value }))}
          rows={6}
          placeholder="Select a product, then click AI to generate with Gemini…"
          className="font-mono text-xs"
        />
      )}
    </div>
  );
}
