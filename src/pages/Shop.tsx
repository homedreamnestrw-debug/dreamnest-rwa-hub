import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function Shop() {
  const { shopEnabled, isLoading: shopLoading } = useShopEnabled();
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", categorySlug, search, sortBy],
    queryFn: async () => {
      let query = supabase.from("products").select("*, categories(name, slug)").eq("is_active", true);

      if (categorySlug) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
        if (cat) query = query.eq("category_id", cat.id);
      }

      if (search) query = query.ilike("name", `%${search}%`);

      if (sortBy === "newest") query = query.order("created_at", { ascending: false });
      else if (sortBy === "price_asc") query = query.order("price", { ascending: true });
      else if (sortBy === "price_desc") query = query.order("price", { ascending: false });
      else if (sortBy === "name") query = query.order("name");

      const { data } = await query;
      return data ?? [];
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  if (!shopLoading && !shopEnabled) return <ComingSoon />;

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl lg:text-4xl font-serif mb-2">
            {categorySlug ? categories?.find((c: any) => c.slug === categorySlug)?.name ?? "Shop" : "Shop All"}
          </h1>
          <p className="text-muted-foreground">Explore our curated collection of premium home essentials</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant={!categorySlug ? "default" : "outline"} size="sm" onClick={() => setSearchParams({})}>All</Button>
            {categories?.map((cat: any) => (
              <Button
                key={cat.id}
                variant={categorySlug === cat.slug ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchParams({ category: cat.slug })}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low → High</SelectItem>
              <SelectItem value="price_desc">Price: High → Low</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-square bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <Link key={product.id} to={`/product/${product.slug}`} className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif text-lg">DreamNest</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.categories?.name}</p>
                  <h3 className="font-medium group-hover:text-soft-gold transition-colors">{product.name}</h3>
                  <p className="font-serif text-lg">{formatPrice(product.price)}</p>
                  {product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0 && (
                    <p className="text-xs text-destructive">Low stock</p>
                  )}
                  {product.stock_quantity === 0 && <p className="text-xs text-destructive">Out of stock</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-serif text-xl text-muted-foreground">No products found</p>
            <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setSearchParams({}); }}>Clear Filters</Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
