import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Sparkles, ImageIcon, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export type OptionsSchema = Record<string, string[]>;
export interface VariantRow {
  id?: string;             // existing variant id
  variant_name: string;    // e.g. "Queen / Beige"
  attributes: Record<string, string>; // {Size: "Queen", Color: "Beige"}
  sku: string;
  price_override: number | null;
  is_active: boolean;
  image_url: string | null; // optional override image (must be one of product.images)
  description?: string | null; // optional variant-specific description
  stock: Record<string, number>; // location_id -> qty
}

interface Props {
  productId: string | null; // null when product not yet created
  basePrice: number;
  locations: { id: string; name: string }[];
  options: OptionsSchema;
  onOptionsChange: (next: OptionsSchema) => void;
  variants: VariantRow[];
  onVariantsChange: (next: VariantRow[]) => void;
  productImages?: string[];
}

const cartesian = (lists: string[][]): string[][] => {
  if (lists.length === 0) return [];
  return lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((a) => list.map((v) => [...a, v])),
    [[]]
  );
};

export function VariantManager({
  basePrice,
  locations,
  options,
  onOptionsChange,
  variants,
  onVariantsChange,
  productImages = [],
}: Props) {
  const [newOptName, setNewOptName] = useState("");
  const [newOptValue, setNewOptValue] = useState<Record<string, string>>({});

  const optionNames = Object.keys(options);
  const hasOptions = optionNames.length > 0;

  const addOption = () => {
    const name = newOptName.trim();
    if (!name) return;
    if (options[name]) { toast({ title: "Option already exists" }); return; }
    onOptionsChange({ ...options, [name]: [] });
    setNewOptName("");
  };

  const removeOption = (name: string) => {
    const { [name]: _, ...rest } = options;
    onOptionsChange(rest);
    // strip from variants
    onVariantsChange(
      variants.map((v) => {
        const { [name]: __, ...attrs } = v.attributes;
        return { ...v, attributes: attrs, variant_name: Object.values(attrs).join(" / ") };
      })
    );
  };

  const addOptionValue = (name: string) => {
    const val = (newOptValue[name] || "").trim();
    if (!val) return;
    if (options[name].includes(val)) return;
    onOptionsChange({ ...options, [name]: [...options[name], val] });
    setNewOptValue({ ...newOptValue, [name]: "" });
  };

  const removeOptionValue = (name: string, val: string) => {
    onOptionsChange({ ...options, [name]: options[name].filter((v) => v !== val) });
    onVariantsChange(variants.filter((v) => v.attributes[name] !== val));
  };

  const generateRows = () => {
    if (!hasOptions) return;
    const lists = optionNames.map((n) => options[n]);
    if (lists.some((l) => l.length === 0)) {
      toast({ title: "Add at least one value to every option", variant: "destructive" });
      return;
    }
    const combos = cartesian(lists);
    const existingByKey = new Map(
      variants.map((v) => [optionNames.map((n) => v.attributes[n] ?? "").join("|"), v])
    );
    const next: VariantRow[] = combos.map((combo) => {
      const attrs: Record<string, string> = {};
      optionNames.forEach((n, i) => { attrs[n] = combo[i]; });
      const key = combo.join("|");
      const existing = existingByKey.get(key);
      const variant_name = combo.join(" / ");
      if (existing) return { ...existing, attributes: attrs, variant_name };
      const initStock: Record<string, number> = {};
      locations.forEach((l) => { initStock[l.id] = 0; });
      return {
        variant_name,
        attributes: attrs,
        sku: "",
        price_override: null,
        is_active: true,
        image_url: null,
        description: null,
        stock: initStock,
      };
    });
    onVariantsChange(next);
  };

  const updateVariant = (idx: number, patch: Partial<VariantRow>) => {
    onVariantsChange(variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const updateVariantStock = (idx: number, locId: string, qty: number) => {
    onVariantsChange(
      variants.map((v, i) =>
        i === idx ? { ...v, stock: { ...v.stock, [locId]: qty } } : v
      )
    );
  };

  return (
    <div className="space-y-4 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Variants (size, color…)</Label>
        {hasOptions && (
          <Button type="button" variant="outline" size="sm" onClick={generateRows}>
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate combinations
          </Button>
        )}
      </div>

      {/* Define option types */}
      <div className="space-y-2">
        {optionNames.map((name) => (
          <div key={name} className="rounded-md bg-muted/40 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide">{name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => {
                  if (!confirm(`Remove the "${name}" option and all its variants?`)) return;
                  const affected = variants.filter((v) => v.attributes[name] !== undefined).length;
                  removeOption(name);
                  toast({
                    title: `Removed option "${name}"`,
                    description: affected > 0 ? `Updated ${affected} variant${affected === 1 ? "" : "s"}.` : undefined,
                  });
                }}
                title={`Remove ${name} option`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove {name}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {options[name].map((v) => (
                <Badge key={v} variant="secondary" className="gap-1">
                  {v}
                  <button type="button" onClick={() => removeOptionValue(name, v)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex gap-1">
                <Input
                  placeholder={`add ${name.toLowerCase()}…`}
                  className="h-7 w-32 text-xs"
                  value={newOptValue[name] || ""}
                  onChange={(e) => setNewOptValue({ ...newOptValue, [name]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOptionValue(name); } }}
                />
                <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => addOptionValue(name)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            placeholder="New option (e.g. Size, Color)…"
            className="h-8 text-sm"
            value={newOptName}
            onChange={(e) => setNewOptName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
          />
          <Button type="button" size="sm" variant="outline" onClick={addOption}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add option
          </Button>
        </div>
        {!hasOptions && (
          <p className="text-xs text-muted-foreground">
            No variants. This product will sell as a single SKU.
          </p>
        )}
      </div>

      {/* Variant rows */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {variants.length} variant{variants.length === 1 ? "" : "s"} — fill SKU, price (leaves base price if blank), and stock per location.
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {variants.map((v, idx) => (
              <div key={idx} className="rounded-md border p-2 space-y-2 bg-card">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Variant name"
                    value={v.variant_name}
                    onChange={(e) => updateVariant(idx, { variant_name: e.target.value })}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      const prev = (v as any)._lastName ?? v.variant_name;
                      if (next && next !== prev) {
                        toast({ title: "Variant renamed", description: `"${prev}" → "${next}"` });
                        (v as any)._lastName = next;
                      }
                    }}
                    className="h-7 flex-1 text-xs font-medium"
                  />
                  <Input
                    placeholder="SKU"
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                    className="h-7 w-28 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder={`Price (${basePrice})`}
                    value={v.price_override ?? ""}
                    onChange={(e) =>
                      updateVariant(idx, { price_override: e.target.value === "" ? null : +e.target.value })
                    }
                    className="h-7 w-28 text-xs"
                    min={0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (!confirm(`Remove variant "${v.variant_name || "(unnamed)"}"?`)) return;
                      onVariantsChange(variants.filter((_, i) => i !== idx));
                    }}
                    title="Delete this variant"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Variant description (optional)"
                  value={v.description ?? ""}
                  onChange={(e) => updateVariant(idx, { description: e.target.value })}
                  rows={1}
                  className="text-xs min-h-[32px] py-1"
                />
                {locations.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {locations.map((l) => (
                      <div key={l.id} className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground flex-1 truncate">{l.name}</span>
                        <Input
                          type="number"
                          min={0}
                          value={v.stock[l.id] ?? 0}
                          onChange={(e) => updateVariantStock(idx, l.id, +e.target.value || 0)}
                          className="h-7 w-20 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {productImages.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      Variant image (optional — shown on product page when this variant is selected)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateVariant(idx, { image_url: null })}
                        className={`h-12 w-12 rounded border-2 flex items-center justify-center text-[10px] ${v.image_url == null ? "border-primary bg-primary/10" : "border-muted text-muted-foreground hover:border-foreground/50"}`}
                        title="Use default product images"
                      >
                        Default
                      </button>
                      {productImages.map((img) => {
                        const selected = v.image_url === img;
                        return (
                          <button
                            key={img}
                            type="button"
                            onClick={() => updateVariant(idx, { image_url: img })}
                            className={`h-12 w-12 rounded overflow-hidden border-2 ${selected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-foreground/40"}`}
                            title={selected ? "Selected" : "Use this image"}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Persist variants for a product. Inserts/updates product_variants and upserts variant_stock.
 * Variants previously present and now removed (by attribute combo) are deactivated, not deleted,
 * so historical orders keep their FK.
 */
export async function persistVariants(
  productId: string,
  variants: VariantRow[]
): Promise<{ error: string | null }> {
  // Fetch existing variants for this product
  const { data: existing, error: fetchErr } = await supabase
    .from("product_variants")
    .select("id, attributes, is_active")
    .eq("product_id", productId);
  if (fetchErr) return { error: fetchErr.message };

  const keyOf = (attrs: Record<string, any>) =>
    Object.keys(attrs).sort().map((k) => `${k}=${attrs[k]}`).join("|");

  const existingByKey = new Map((existing ?? []).map((e: any) => [keyOf(e.attributes ?? {}), e]));
  const incomingKeys = new Set(variants.map((v) => keyOf(v.attributes)));

  // Deactivate removed
  const toDeactivate = (existing ?? []).filter((e: any) => e.is_active && !incomingKeys.has(keyOf(e.attributes ?? {})));
  if (toDeactivate.length > 0) {
    const { error } = await supabase
      .from("product_variants")
      .update({ is_active: false })
      .in("id", toDeactivate.map((e: any) => e.id));
    if (error) return { error: error.message };
  }

  // Upsert each variant
  for (const v of variants) {
    const key = keyOf(v.attributes);
    const match = existingByKey.get(key) as any;
    let variantId: string;
    if (match) {
      const { error } = await supabase
        .from("product_variants")
        .update({
          variant_name: v.variant_name,
          attributes: v.attributes,
          sku: v.sku || null,
          price_override: v.price_override,
          image_url: v.image_url ?? null,
          description: v.description ?? null,
          is_active: true,
        } as any)
        .eq("id", match.id);
      if (error) return { error: error.message };
      variantId = match.id;
    } else {
      const { data, error } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          variant_name: v.variant_name,
          attributes: v.attributes,
          sku: v.sku || null,
          price_override: v.price_override,
          image_url: v.image_url ?? null,
          description: v.description ?? null,
          is_active: true,
        } as any)
        .select("id")
        .single();
      if (error || !data) return { error: error?.message ?? "insert failed" };
      variantId = data.id;
    }

    // Upsert stock rows
    const stockRows = Object.entries(v.stock).map(([location_id, quantity]) => ({
      variant_id: variantId,
      location_id,
      quantity: quantity || 0,
    }));
    if (stockRows.length > 0) {
      const { error } = await supabase
        .from("variant_stock")
        .upsert(stockRows, { onConflict: "variant_id,location_id" });
      if (error) return { error: error.message };
    }
  }

  return { error: null };
}
