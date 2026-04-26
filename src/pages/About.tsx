import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Leaf, Heart, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { SEO } from "@/components/SEO";

export default function About() {
  const { content: c } = useWebsiteContent();
  const { shopEnabled } = useShopEnabled();

  const { data: featuredProducts } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, images, categories(name)")
        .eq("is_active", true)
        .eq("featured", true)
        .limit(4);
      return data ?? [];
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  return (
    <PublicLayout>
      <SEO
        title="About DreamNest — Premium Bedding Rwanda, Crafted in Kigali"
        description="DreamNest is Kigali's home for premium bedding Rwanda loves — bedroom sets, pillows, storage boxes and home decor blending artisan craft with modern elegance."
        keywords="premium bedding Rwanda, bedding Kigali, home decor Kigali, home decor Rwanda, bedroom sets Kigali, DreamNest about"
      />
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Our Story</p>
          <h1 className="text-4xl lg:text-5xl font-serif mb-6">{c.about_title ?? "Crafted with Love in Rwanda"}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {c.about_description ?? "DreamNest was born from a simple belief — everyone deserves to come home to comfort and beauty. Based in Kigali, we curate premium bedding and home decor in Kigali, Rwanda — from bedroom sets and pillows to storage boxes — blending artisan craftsmanship with modern elegance."}
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto text-center">
            <div className="space-y-4">
              <Leaf className="h-10 w-10 text-soft-gold mx-auto" />
              <h3 className="font-serif text-xl">{c.about_value_1_title ?? "Sustainable"}</h3>
              <p className="text-muted-foreground text-sm">{c.about_value_1_desc ?? "We prioritize eco-friendly materials and ethical sourcing in every product we offer."}</p>
            </div>
            <div className="space-y-4">
              <Heart className="h-10 w-10 text-soft-gold mx-auto" />
              <h3 className="font-serif text-xl">{c.about_value_2_title ?? "Community"}</h3>
              <p className="text-muted-foreground text-sm">{c.about_value_2_desc ?? "Supporting local artisans and empowering Rwandan craftsmanship."}</p>
            </div>
            <div className="space-y-4">
              <Star className="h-10 w-10 text-soft-gold mx-auto" />
              <h3 className="font-serif text-xl">{c.about_value_3_title ?? "Quality"}</h3>
              <p className="text-muted-foreground text-sm">{c.about_value_3_desc ?? "Every piece meets our exacting standards for comfort and durability."}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {shopEnabled && featuredProducts && featuredProducts.length > 0 && (
        <section className="py-20 bg-secondary">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Curated for You</p>
              <h2 className="text-3xl lg:text-4xl font-serif">Featured Products</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product: any) => (
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
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/shop"><Button variant="outline" size="lg">View All Products <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
