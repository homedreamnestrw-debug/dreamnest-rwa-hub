import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Package } from "lucide-react";
import { ProductData } from "./templates/productCardRenderers";

interface ProductPickerProps {
  selectedId?: string | null;
  onSelect: (p: ProductData) => void;
}

export function ProductPicker({ selectedId, onSelect }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  const { data: categories = [] } = useQuery({
    queryKey: ["studio-cats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      return data ?? [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["studio-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, description, price, sku, stock_quantity, low_stock_threshold, images, category_id",
        )
        .eq("is_active", true)
        .order("name")
        .limit(500);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p: any) => {
      if (categoryId !== "all" && p.category_id !== categoryId) return false;
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryId]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-8"
        />
      </div>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ScrollArea className="h-[420px] rounded-md border">
        <div className="grid grid-cols-2 gap-2 p-2">
          {isLoading && (
            <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              No products
            </div>
          )}
          {filtered.map((p: any) => {
            const img = p.images?.[0] ?? "";
            const isSel = selectedId === p.id;
            return (
              <button
                key={p.id}
                onClick={() =>
                  onSelect({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    sku: p.sku,
                    stock: p.stock_quantity,
                    lowStockThreshold: p.low_stock_threshold,
                    imageUrl: img,
                  })
                }
                className={cn(
                  "group flex flex-col overflow-hidden rounded-md border text-left transition-colors hover:border-primary",
                  isSel && "border-primary ring-2 ring-primary/40",
                )}
              >
                <div className="aspect-square bg-muted">
                  {img ? (
                    <img
                      loading="lazy"
                      src={img}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="line-clamp-1 text-xs font-medium">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    RWF {Number(p.price).toLocaleString()} · stock{" "}
                    {p.stock_quantity}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
