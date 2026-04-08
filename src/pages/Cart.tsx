import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export default function Cart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("*, products(name, price, images, slug, stock_quantity)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        await supabase.from("cart_items").delete().eq("id", id);
      } else {
        await supabase.from("cart_items").update({ quantity }).eq("id", id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("cart_items").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed");
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  if (!user) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-serif mb-4">Your Cart</h1>
          <p className="text-muted-foreground mb-6">Sign in to view your cart</p>
          <Link to="/auth/login"><Button>Sign In</Button></Link>
        </div>
      </PublicLayout>
    );
  }

  const subtotal = cartItems?.reduce((sum: number, item: any) => sum + (item.products?.price ?? 0) * item.quantity, 0) ?? 0;
  const taxRate = 0.18;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif mb-8">Shopping Cart</h1>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
        ) : cartItems && cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                  <Link to={`/product/${item.products?.slug}`} className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.products?.images?.[0] ? (
                      <img src={item.products.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.products?.slug}`} className="font-medium hover:underline">{item.products?.name}</Link>
                    <p className="text-sm text-muted-foreground mt-1">{formatPrice(item.products?.price ?? 0)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 })}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <p className="font-serif">{formatPrice((item.products?.price ?? 0) * item.quantity)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem.mutate(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border rounded-lg p-6 h-fit space-y-4">
              <h2 className="font-serif text-xl">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (18%)</span><span>{formatPrice(tax)}</span></div>
                <div className="border-t pt-2 flex justify-between font-medium text-base">
                  <span>Total</span><span className="font-serif">{formatPrice(total)}</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/checkout")}>
                Proceed to Checkout
              </Button>
              <Link to="/shop" className="block text-center text-sm text-muted-foreground hover:underline">
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-serif mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Discover our curated collection of premium home essentials.</p>
            <Link to="/shop"><Button>Start Shopping</Button></Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
