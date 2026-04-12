import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Package, User, Heart, LogOut, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) {
    navigate("/auth/login");
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif mb-8">My Account</h1>
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2">
              <Heart className="h-4 w-4" /> Wishlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTab userId={user.id} />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileTab userId={user.id} email={user.email ?? ""} onSignOut={signOut} />
          </TabsContent>
          <TabsContent value="wishlist">
            <WishlistTab userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}

function OrdersTab({ userId }: { userId: string }) {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "default";
      case "shipped": case "processing": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-serif mb-2">No orders yet</p>
          <p className="text-sm text-muted-foreground mb-4">Your order history will appear here.</p>
          <Link to="/shop"><Button>Start Shopping</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <Card key={order.id}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium">#{order.order_number}</span>
                  <Badge variant={statusColor(order.status) as any}>{order.status}</Badge>
                  <Badge variant="outline">{order.payment_status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <p className="font-serif text-lg">{formatPrice(order.total)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProfileTab({ userId, email, onSignOut }: { userId: string; email: string; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    shipping_address: "",
    city: "",
  });

  // Sync profile data to form when loaded
  const profileLoaded = profile?.user_id;
  useState(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        shipping_address: profile.shipping_address ?? "",
        city: profile.city ?? "",
      });
    }
  });

  // Update form when profile changes
  if (profile && form.full_name === "" && profile.full_name) {
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      shipping_address: profile.shipping_address ?? "",
      city: profile.city ?? "",
    });
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(form)
      .eq("user_id", userId);
    if (error) toast.error("Failed to update profile");
    else {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    }
    setSaving(false);
  };

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="+250 7XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="shipping_address">Shipping Address</Label>
              <Input id="shipping_address" value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Button variant="outline" className="text-destructive" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      {profile && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium">Loyalty Points</p>
              <p className="text-2xl font-serif">{profile.loyalty_points.toLocaleString()}</p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {profile.loyalty_points >= 5000 ? "Platinum" : profile.loyalty_points >= 2000 ? "Gold" : profile.loyalty_points >= 500 ? "Silver" : "Bronze"}
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WishlistTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ["my-wishlist", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("wishlist_items")
        .select("*, products(name, price, slug, images)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("wishlist_items").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-wishlist"] });
      toast.success("Removed from wishlist");
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  if (!wishlist || wishlist.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-serif mb-2">Your wishlist is empty</p>
          <p className="text-sm text-muted-foreground mb-4">Save items you love to find them later.</p>
          <Link to="/shop"><Button>Browse Products</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {wishlist.map((item: any) => (
        <div key={item.id} className="group relative">
          <Link to={`/product/${item.products?.slug}`}>
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3">
              {item.products?.images?.[0] ? (
                <img src={item.products.images[0]} alt={item.products.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-serif">DreamNest</div>
              )}
            </div>
            <h3 className="font-medium group-hover:text-soft-gold transition-colors">{item.products?.name}</h3>
            <p className="font-serif">{formatPrice(item.products?.price ?? 0)}</p>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm"
            onClick={() => removeItem.mutate(item.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
