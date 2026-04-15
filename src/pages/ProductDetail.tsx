import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";
import { toast } from "sonner";
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { ReviewForm } from "@/components/product/ReviewForm";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function ProductDetail() {
  const { shopEnabled, isLoading: shopLoading } = useShopEnabled();
  if (!shopLoading && !shopEnabled) return <ComingSoon />;
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const queryClient = useQueryClient();
  const { addItem } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
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
        .select("*")
        .eq("product_id", product!.id)
        .eq("is_active", true);
      return data ?? [];
    },
    enabled: !!product?.id,
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const addToCart = async () => {
    if (!product) return;
    await addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      slug: product.slug,
      images: product.images,
      stock_quantity: product.stock_quantity,
    }, quantity);
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

  return (
    <PublicLayout>
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

            <p className="text-3xl font-serif">{formatPrice(product.price)}</p>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {variants && variants.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Variants</p>
                <div className="flex gap-2 flex-wrap">
                  {variants.map((v: any) => (
                    <Button key={v.id} variant="outline" size="sm">{v.variant_name}</Button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button className="flex-1" size="lg" disabled={product.stock_quantity === 0} onClick={addToCart}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button variant="outline" size="icon" className="h-11 w-11" onClick={addToWishlist}>
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold && (
              <p className="text-sm text-destructive">Only {product.stock_quantity} left in stock</p>
            )}

            {product.sku && (
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
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
      </div>
    </PublicLayout>
  );
}
