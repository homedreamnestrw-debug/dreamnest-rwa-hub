import { PublicLayout } from "@/components/layout/PublicLayout";
import { Leaf, Heart, Star } from "lucide-react";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

export default function About() {
  const { content: c } = useWebsiteContent();

  return (
    <PublicLayout>
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Our Story</p>
          <h1 className="text-4xl lg:text-5xl font-serif mb-6">{c.about_title ?? "Crafted with Love in Rwanda"}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {c.about_description ?? "DreamNest was born from a simple belief — everyone deserves to come home to comfort and beauty. Based in Kigali, we curate premium bedding and home decor pieces that blend artisan craftsmanship with modern elegance."}
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto text-center">
            <div className="space-y-4">
              <Leaf className="h-10 w-10 text-soft-gold mx-auto" />
              <h3 className="font-serif text-xl">Sustainable</h3>
              <p className="text-muted-foreground text-sm">We prioritize eco-friendly materials and ethical sourcing in every product we offer.</p>
            </div>
            <div className="space-y-4">
              <Heart className="h-10 w-10 text-soft-gold mx-auto" />
              <h3 className="font-serif text-xl">Community</h3>
              <p className="text-muted-foreground text-sm">Supporting local artisans and empowering Rwandan craftsmanship.</p>
            </div>
            <div className="space-y-4">
              <Star className="h-10 w-10 text-soft-gold mx-auto" />
              <h3 className="font-serif text-xl">Quality</h3>
              <p className="text-muted-foreground text-sm">Every piece meets our exacting standards for comfort and durability.</p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
