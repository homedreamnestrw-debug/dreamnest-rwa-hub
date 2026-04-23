import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedProductsProps {
  excludeId?: string;
  title?: string;
  limit?: number;
}

export function FeaturedProducts({ excludeId, title = "You May Also Like", limit = 4 }: FeaturedProductsProps) {
  const { data: products } = useQuery({
    queryKey: ["featured-products", excludeId, limit],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, images")
        .eq("is_active", true)
        .eq("featured", true)
        .limit(limit + (excludeId ? 1 : 0));
      const { data } = await query;
      return (data ?? []).filter((p) => p.id !== excludeId).slice(0, limit);
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-20 border-t pt-12">
      <h2 className="text-2xl md:text-3xl font-serif mb-8 text-center">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => (
          <Link
            key={p.id}
            to={`/product/${p.slug}`}
            className="group block"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3">
              {p.images?.[0] ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">
                  DreamNest
                </div>
              )}
            </div>
            <h3 className="text-sm font-medium line-clamp-1 group-hover:underline">{p.name}</h3>
            <p className="text-sm font-serif text-muted-foreground mt-1">{formatPrice(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
