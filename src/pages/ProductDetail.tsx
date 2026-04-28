import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { ReviewForm } from "@/components/product/ReviewForm";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { SEO } from "@/components/SEO";
import { FeaturedProducts } from "@/components/product/FeaturedProducts";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { shopEnabled, isLoading: shopLoading } = useShopEnabled();

  if (!shopLoading && !shopEnabled) return <ComingSoon />;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, description, price, sku, images, stock_quantity, low_stock_threshold, category_id, tax_enabled, is_active, featured, variant_attributes, created_at, updated_at, categories(name, slug)")
        .eq("slug", slug!)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, profiles(full_name)")
        .eq("product_id", product!.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!product?.id,
  });

  const { data: variants } = useQuery({
    queryKey: ["variants", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, variant_name, sku, price_override, attributes, stock_quantity, is_active")
        .eq("product_id", product!.id)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!product?.id,
  });

  const optionsSchema: Record<string, string[]> =
    (product as any)?.variant_attributes && typeof (product as any).variant_attributes === "object"
      ? ((product as any).variant_attributes as Record<string, string[]>)
      : {};
  const optionNames = Object.keys(optionsSchema);
  const hasVariants = optionNames.length > 0 && (variants?.length ?? 0) > 0;

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Reset selection when product changes
  useEffect(() => {
    setSelectedOptions({});
  }, [product?.id]);

  const matchedVariant = hasVariants
    ? variants!.find((v: any) =>
        optionNames.every((n) => (v.attributes ?? {})[n] === selectedOptions[n])
      )
    : null;

  const effectivePrice = matchedVariant?.price_override ?? product?.price ?? 0;
  const effectiveStock = hasVariants
    ? (matchedVariant?.stock_quantity ?? 0)
    : (product?.stock_quantity ?? 0);


  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const addToCart = async () => {
    if (!product) return;
    if (hasVariants && !matchedVariant) {
      toast.error(`Please choose ${optionNames.join(" and ")}`);
      return;
    }
    if (effectiveStock <= 0) {
      toast.error("This item is out of stock");
      return;
    }
    if (quantity > effectiveStock) {
      toast.error(`Only ${effectiveStock} available in stock`);
      return;
    }
    await addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        slug: product.slug,
        images: product.images,
        stock_quantity: product.stock_quantity,
      },
      quantity,
      matchedVariant
        ? {
            id: matchedVariant.id,
            variant_name: matchedVariant.variant_name,
            price_override: matchedVariant.price_override ?? null,
            attributes: (matchedVariant.attributes ?? null) as Record<string, string> | null,
            sku: matchedVariant.sku ?? null,
          }
        : null,
      hasVariants ? effectiveStock : undefined,
    );
    toast.success("Added to cart!");
  };

  const addToWishlist = async () => {
    if (!user) {
      toast.error("Please sign in to save items");
      return;
    }
    const { error } = await supabase.from("wishlist_items").insert({
      user_id: user.id,
      product_id: product!.id,
    });
    if (error?.code === "23505") toast.info("Already in your wishlist");
    else if (error) toast.error("Failed to add to wishlist");
    else toast.success("Added to wishlist!");
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20">
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted rounded-lg" />
            <div className="space-y-6">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!product) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-serif mb-4">Product Not Found</h1>
          <Link to="/shop"><Button variant="outline">Back to Shop</Button></Link>
        </div>
      </PublicLayout>
    );
  }

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const productImage = product.images?.[0];
  const categoryName = product.categories?.name ?? "home decor";
  const seoDesc = product.description
    ? product.description.replace(/<[^>]*>/g, "").slice(0, 160)
    : `Buy ${product.name} at DreamNest — premium bedding Kigali, ${categoryName} in Rwanda. Quality home decor delivered across Kigali.`;
  const seoKeywords = `${product.name}, ${categoryName} Kigali, bedding Kigali, premium bedding Rwanda, home decor Rwanda, DreamNest`;
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: product.images ?? [],
    description: seoDesc,
    sku: product.sku ?? undefined,
    category: product.categories?.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "RWF",
      price: product.price,
      availability: product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(avgRating && reviews && reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating,
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  return (
    <PublicLayout>
      <SEO
        title={`${product.name} — DreamNest Kigali, Rwanda`}
        description={seoDesc}
        keywords={seoKeywords}
        image={productImage}
        type="product"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {product.categories && (
            <>
              <span>/</span>
              <Link to={`/shop?category=${product.categories.slug}`} className="hover:text-foreground">{product.categories.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              {product.images?.[selectedImage] ? (
                <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif text-2xl">DreamNest</div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${i === selectedImage ? "border-foreground" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              {product.categories && (
                <p className="text-sm uppercase tracking-[0.15em] text-muted-foreground mb-2">{product.categories.name}</p>
              )}
              <h1 className="text-3xl lg:text-4xl font-serif">{product.name}</h1>
            </div>

            {avgRating && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-soft-gold text-soft-gold" : "text-muted"}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{avgRating} ({reviews?.length} reviews)</span>
              </div>
            )}

            <p className="text-3xl font-serif">{formatPrice(effectivePrice)}</p>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {hasVariants && (
              <div className="space-y-3">
                {optionNames.map((opt) => (
                  <div key={opt} className="space-y-1.5">
                    <p className="text-sm font-medium">
                      {opt}: <span className="text-muted-foreground font-normal">{selectedOptions[opt] ?? "Choose"}</span>
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {(optionsSchema[opt] ?? []).map((val) => {
                        // Determine availability: a value is available if at least one variant matching
                        // current selections (excluding this option) + this value is in stock.
                        const candidateOptions = { ...selectedOptions, [opt]: val };
                        const candidate = variants!.find((v: any) =>
                          optionNames.every((n) => (v.attributes ?? {})[n] === candidateOptions[n])
                        );
                        const inStock = candidate ? (candidate.stock_quantity ?? 0) > 0 : false;
                        const isSelected = selectedOptions[opt] === val;
                        return (
                          <Button
                            key={val}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={!inStock && !isSelected}
                            onClick={() => setSelectedOptions({ ...selectedOptions, [opt]: val })}
                            className={!inStock ? "line-through opacity-60" : ""}
                          >
                            {val}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={effectiveStock <= 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))} disabled={effectiveStock <= 0 || quantity >= effectiveStock}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="flex-1"
                size="lg"
                disabled={effectiveStock <= 0 || (hasVariants && !matchedVariant)}
                onClick={addToCart}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {hasVariants && !matchedVariant
                  ? `Select ${optionNames.join(" & ")}`
                  : effectiveStock <= 0
                  ? "Out of Stock"
                  : "Add to Cart"}
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={addToWishlist}>
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {effectiveStock > 0 && effectiveStock <= product.low_stock_threshold && (
              <p className="text-sm text-destructive">Only {effectiveStock} left in stock</p>
            )}

            {(matchedVariant?.sku || product.sku) && (
              <p className="text-xs text-muted-foreground">SKU: {matchedVariant?.sku || product.sku}</p>
            )}
          </div>
        </div>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <section className="mt-20">
            <h2 className="text-2xl font-serif mb-8">Customer Reviews</h2>
            <div className="space-y-6 max-w-2xl">
              {reviews.map((review: any) => (
                <div key={review.id} className="border-b pb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-soft-gold text-soft-gold" : "text-muted"}`} />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{review.profiles?.full_name ?? "Customer"}</span>
                  </div>
                  {review.comment && <p className="text-muted-foreground text-sm">{review.comment}</p>}
                </div>
              ))}
            </div>

            {user && product && (
              <ReviewForm
                productId={product.id}
                userId={user.id}
                onSubmitted={() => queryClient.invalidateQueries({ queryKey: ["reviews", product.id] })}
              />
            )}
          </section>
        )}

        {/* Review form when no reviews yet */}
        {user && product && (!reviews || reviews.length === 0) && (
          <section className="mt-20">
            <h2 className="text-2xl font-serif mb-8">Be the First to Review</h2>
            <div className="max-w-2xl">
              <ReviewForm
                productId={product.id}
                userId={user.id}
                onSubmitted={() => queryClient.invalidateQueries({ queryKey: ["reviews", product.id] })}
              />
            </div>
          </section>
        )}

        <FeaturedProducts excludeId={product.id} title="You May Also Like" />
      </div>
    </PublicLayout>
  );
}
