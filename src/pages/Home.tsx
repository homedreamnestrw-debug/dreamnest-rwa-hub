import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Star, Truck, Shield, Leaf } from "lucide-react";

export default function Home() {
  const { data: featuredProducts } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .eq("featured", true)
        .limit(4);
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").limit(6);
      return data ?? [];
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-secondary py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl space-y-6 animate-fade-in">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-medium">Premium Bedding & Home Decor</p>
            <h1 className="text-4xl lg:text-6xl font-serif text-foreground leading-tight">
              Comfort Meets <br />
              <span className="text-soft-gold italic">Elegance</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Discover handcrafted bedding and decor pieces that transform your home into a sanctuary of warmth and style.
            </p>
            <div className="flex gap-4 pt-2">
              <Link to="/shop">
                <Button size="lg" className="font-medium">
                  Shop Collection <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="lg" className="font-medium">Our Story</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Truck className="h-8 w-8 text-soft-gold" />
              <h3 className="font-serif text-lg">Free Delivery in Kigali</h3>
              <p className="text-sm text-muted-foreground">On orders above 50,000 RWF</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Shield className="h-8 w-8 text-soft-gold" />
              <h3 className="font-serif text-lg">Quality Guaranteed</h3>
              <p className="text-sm text-muted-foreground">30-day return policy</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Leaf className="h-8 w-8 text-soft-gold" />
              <h3 className="font-serif text-lg">Sustainably Made</h3>
              <p className="text-sm text-muted-foreground">Eco-friendly materials</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Browse</p>
              <h2 className="text-3xl lg:text-4xl font-serif">Shop by Category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
              {categories.map((cat: any) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-linen flex items-end p-6 hover:shadow-lg transition-shadow"
                >
                  {cat.image_url && (
                    <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="relative z-10 bg-background/90 backdrop-blur-sm rounded-md px-4 py-2">
                    <h3 className="font-serif text-lg">{cat.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Curated for You</p>
            <h2 className="text-3xl lg:text-4xl font-serif">Featured Products</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts && featuredProducts.length > 0 ? (
              featuredProducts.map((product: any) => (
                <Link key={product.id} to={`/product/${product.slug}`} className="group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">DreamNest</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.categories?.name}</p>
                    <h3 className="font-medium text-foreground group-hover:text-soft-gold transition-colors">{product.name}</h3>
                    <p className="font-serif text-lg">{formatPrice(product.price)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground font-serif text-lg">New arrivals coming soon</p>
                <Link to="/shop"><Button variant="outline" className="mt-4">Browse Shop</Button></Link>
              </div>
            )}
          </div>
          {featuredProducts && featuredProducts.length > 0 && (
            <div className="text-center mt-10">
              <Link to="/shop"><Button variant="outline" size="lg">View All Products <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center max-w-xl">
          <h2 className="text-3xl font-serif mb-4">Stay in the Loop</h2>
          <p className="text-muted-foreground mb-8">Subscribe for exclusive offers, new arrivals, and home styling tips.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const email = (form.elements.namedItem("email") as HTMLInputElement).value;
              await supabase.from("newsletter_subscribers").insert({ email });
              form.reset();
            }}
            className="flex gap-3"
          >
            <input
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              className="flex-1 h-11 rounded-md border border-input bg-background px-4 text-sm"
            />
            <Button type="submit">Subscribe</Button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}
