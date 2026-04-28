import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CartVariant {
  id: string;
  variant_name: string;
  price_override: number | null;
  attributes: Record<string, string> | null;
  sku: string | null;
}

export interface CartItemData {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    slug: string;
    images: string[] | null;
    stock_quantity: number;
  } | null;
  variant: CartVariant | null;
  /** Resolved unit price: variant override or product base price */
  unit_price: number;
}

const GUEST_CART_KEY = "dreamnest_guest_cart";

function getGuestCart(): CartItemData[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function setGuestCart(items: CartItemData[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [guestItems, setGuestItems] = useState<CartItemData[]>(getGuestCart);

  // Sync guest cart state to localStorage
  useEffect(() => {
    if (!user) setGuestCart(guestItems);
  }, [guestItems, user]);

  // When user logs in, merge guest cart into Supabase cart
  useEffect(() => {
    if (!user) return;
    const guest = getGuestCart();
    if (guest.length === 0) return;

    (async () => {
      for (const item of guest) {
        // Try to find an existing row with same product+variant
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("product_id", item.product_id)
          .is("variant_id", item.variant_id ?? null as any)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("cart_items")
            .update({ quantity: existing.quantity + item.quantity })
            .eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({
            user_id: user.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          });
        }
      }
      localStorage.removeItem(GUEST_CART_KEY);
      setGuestItems([]);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    })();
  }, [user]);

  // Auth cart query
  const { data: authItems, isLoading: authLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select(
          "id, product_id, variant_id, quantity, products(id, name, price, slug, images, stock_quantity), product_variants(id, variant_name, price_override, attributes, sku)"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((d: any) => {
        const variant = d.product_variants ?? null;
        const unit_price = variant?.price_override ?? d.products?.price ?? 0;
        return {
          id: d.id,
          product_id: d.product_id,
          variant_id: d.variant_id,
          quantity: d.quantity,
          product: d.products,
          variant,
          unit_price,
        } as CartItemData;
      });
    },
    enabled: !!user,
  });

  const cartItems: CartItemData[] = user ? (authItems ?? []) : guestItems;
  const isLoading = user ? authLoading : false;

  const addItem = useCallback(
    async (
      product: { id: string; name: string; price: number; slug: string; images: string[] | null; stock_quantity: number },
      quantity = 1,
      variant?: CartVariant | null,
      variantStock?: number,
    ) => {
      const variant_id = variant?.id ?? null;
      const stockMax = variant ? (variantStock ?? 0) : product.stock_quantity;
      if (stockMax <= 0) {
        toast.error("This item is out of stock");
        return;
      }
      const currentInCart = user
        ? (authItems?.find((i) => i.product_id === product.id && (i.variant_id ?? null) === variant_id)?.quantity ?? 0)
        : (guestItems.find((i) => i.product_id === product.id && (i.variant_id ?? null) === variant_id)?.quantity ?? 0);
      if (currentInCart + quantity > stockMax) {
        toast.error(`Only ${stockMax} available (you already have ${currentInCart} in cart)`);
        return;
      }
      const unit_price = variant?.price_override ?? product.price;
      if (user) {
        const existing = authItems?.find((i) => i.product_id === product.id && (i.variant_id ?? null) === variant_id);
        if (existing) {
          await supabase.from("cart_items").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
        } else {
          await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, variant_id, quantity });
        }
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      } else {
        setGuestItems((prev) => {
          const existing = prev.find((i) => i.product_id === product.id && (i.variant_id ?? null) === variant_id);
          if (existing) {
            return prev.map((i) =>
              i.product_id === product.id && (i.variant_id ?? null) === variant_id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            );
          }
          return [
            ...prev,
            {
              id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              product_id: product.id,
              variant_id,
              quantity,
              product: { ...product, stock_quantity: stockMax },
              variant: variant ?? null,
              unit_price,
            },
          ];
        });
      }
    },
    [user, authItems, guestItems, queryClient]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const currentItem = user
        ? authItems?.find((i) => i.id === itemId)
        : guestItems.find((i) => i.id === itemId);
      const stockMax = currentItem?.product?.stock_quantity ?? 0;
      if (quantity > 0 && quantity > stockMax) {
        toast.error(`Only ${stockMax} available in stock`);
        return;
      }
      if (user) {
        if (quantity <= 0) {
          await supabase.from("cart_items").delete().eq("id", itemId);
        } else {
          await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
        }
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      } else {
        setGuestItems((prev) =>
          quantity <= 0 ? prev.filter((i) => i.id !== itemId) : prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
        );
      }
    },
    [user, authItems, guestItems, queryClient]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (user) {
        await supabase.from("cart_items").delete().eq("id", itemId);
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      } else {
        setGuestItems((prev) => prev.filter((i) => i.id !== itemId));
      }
    },
    [user, queryClient]
  );

  const clearCart = useCallback(async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    } else {
      setGuestItems([]);
    }
  }, [user, queryClient]);

  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return { cartItems, isLoading, addItem, updateQuantity, removeItem, clearCart, itemCount };
}
