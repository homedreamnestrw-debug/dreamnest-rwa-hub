import { useMemo, useState } from "react";
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
import { Copy, Check, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CaptionType,
  generateCaption,
} from "./templates/captionTemplates";
import { ProductData } from "./templates/productCardRenderers";

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
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const caption = aiText ?? templateCaption;

  useMemo(() => {
    onCaptionChange?.(caption);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caption]);

  const generateAI = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("gemini-generate", {
        body: { mode: "caption", product, captionType: type, salePct },
      });
      if (error) throw error;
      if (!data?.text) throw new Error("Empty response");
      setAiText(data.text);
      toast({ title: "AI caption generated" });
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!caption) return;
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    toast({ title: "Caption copied" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Caption type</Label>
          <Select value={type} onValueChange={(v) => { setType(v as CaptionType); setAiText(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="default" onClick={generateAI} disabled={!product || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI
        </Button>
        <Button size="sm" variant="outline" onClick={copy} disabled={!caption}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy
        </Button>
      </div>
      <Textarea
        value={caption}
        onChange={(e) => setAiText(e.target.value)}
        rows={6}
        placeholder="Select a product, then click AI to generate with Gemini…"
        className="font-mono text-xs"
      />
    </div>
  );
}
