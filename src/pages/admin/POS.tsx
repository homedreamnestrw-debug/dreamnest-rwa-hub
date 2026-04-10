import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Search, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote,
  Loader2, Receipt, X, Printer, MapPin, Clock,
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CompletedOrder {
  order_number: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: string;
  created_at: string;
}

export default function POS() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<CompletedOrder | null>(null);
  const [customerNote, setCustomerNote] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isCredit, setIsCredit] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; full_name: string | null; phone: string | null; user_id: string } | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const searchRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, stock_quantity, sku, images, category_id, categories(name)")
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: settings } = useQuery({
    queryKey: ["business-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_business_settings");
      return data?.[0] ?? null;
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_locations").select("*").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  // Auto-select first location
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  const vatRate = settings?.vat_percentage ? Number(settings.vat_percentage) / 100 : 0.18;
  const businessName = settings?.business_name ?? "DreamNest";

  const filtered = products?.filter(
    (p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  ) ?? [];

  const addToCart = useCallback((product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error("Not enough stock");
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.stock_quantity <= 0) {
        toast.error("Out of stock");
        return prev;
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock_quantity }];
    });
    setSearch("");
    searchRef.current?.focus();
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null as any;
        if (newQty > i.stock) { toast.error("Not enough stock"); return i; }
        return { ...i, quantity: newQty };
      }).filter(Boolean)
    );
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.product_id !== productId));
  const clearCart = () => { setCart([]); setCustomerNote(""); setIsCredit(false); searchRef.current?.focus(); };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = Math.round(subtotal * vatRate);
  const total = subtotal + taxAmount;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const paymentStatus = isCredit ? "unpaid" : "paid";
      const orderStatus = isCredit ? "pending" : "delivered";

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: null,
          channel: "in_store" as const,
          status: orderStatus as any,
          payment_status: paymentStatus as any,
          payment_method: isCredit ? null : paymentMethod,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: 0,
          total,
          notes: customerNote || null,
          location_id: selectedLocation || null,
          served_by: user?.id || null,
        })
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      const items = cart.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.price,
        discount: 0,
        total: i.price * i.quantity,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      setReceiptOrder({
        order_number: order.order_number,
        items: [...cart],
        subtotal,
        tax: taxAmount,
        total,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        created_at: new Date().toISOString(),
      });

      toast.success(`Sale #${order.order_number} completed!${isCredit ? " (Credit)" : ""}`);
      setCart([]);
      setCustomerNote("");
      setIsCredit(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to process sale");
    } finally {
      setSubmitting(false);
    }
  };

  const printReceipt = () => window.print();

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: "cash", label: "Cash", icon: <Banknote className="h-4 w-4" /> },
    { value: "mtn_momo", label: "MTN MoMo", icon: <Smartphone className="h-4 w-4" /> },
    { value: "airtel_money", label: "Airtel", icon: <Smartphone className="h-4 w-4" /> },
    { value: "card", label: "Card", icon: <CreditCard className="h-4 w-4" /> },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)] print:hidden">
        {/* Left: Product search + grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Location + Search bar */}
          <div className="flex gap-3 mb-4">
            {locations && locations.length > 0 && (
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48 h-11">
                  <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc: any) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search products by name or SKU... (F2)"
                className="pl-9 h-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity <= 0}
                  className="text-left p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif text-sm">{formatPrice(product.price)}</span>
                    <Badge variant={product.stock_quantity <= 0 ? "destructive" : product.stock_quantity <= 5 ? "secondary" : "outline"} className="text-xs">
                      {product.stock_quantity}
                    </Badge>
                  </div>
                  {product.sku && <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  {search ? "No products found" : "No products available"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Cart + Checkout */}
        <Card className="lg:w-[380px] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg">Current Sale</CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-4 pt-0">
            <ScrollArea className="flex-1 min-h-0">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No items in sale</p>
                  <p className="text-xs mt-1">Search or click products to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <span className="text-sm font-medium w-20 text-right">{formatPrice(item.price * item.quantity)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="mt-4 space-y-4">
                <Textarea placeholder="Sale note (optional)..." className="h-16 text-sm" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />

                {/* Credit toggle */}
                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Sell on Credit</p>
                      <p className="text-xs text-muted-foreground">Customer pays later</p>
                    </div>
                  </div>
                  <Switch checked={isCredit} onCheckedChange={setIsCredit} />
                </div>

                {/* Payment method (hidden when credit) */}
                {!isCredit && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Payment Method</p>
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((pm) => (
                        <label key={pm.value} className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer text-sm transition-colors ${paymentMethod === pm.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <RadioGroupItem value={pm.value} className="sr-only" />
                          {pm.icon}
                          <span className="font-medium">{pm.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT ({Math.round(vatRate * 100)}%)</span><span>{formatPrice(taxAmount)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-lg font-medium pt-1"><span>Total</span><span className="font-serif">{formatPrice(total)}</span></div>
                </div>

                <Button className="w-full h-12 text-base" onClick={handleCheckout} disabled={submitting} variant={isCredit ? "secondary" : "default"}>
                  {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>) : isCredit ? `Sell on Credit — ${formatPrice(total)}` : `Complete Sale — ${formatPrice(total)}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={() => setReceiptOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Sale Receipt</DialogTitle>
          </DialogHeader>
          {receiptOrder && (
            <div id="receipt" className="space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="font-serif text-xl font-semibold">{businessName}</h3>
                {settings?.address && <p className="text-xs text-muted-foreground">{settings.address}, {settings?.city}</p>}
                {settings?.phone && <p className="text-xs text-muted-foreground">{settings.phone}</p>}
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Receipt #</span><span className="font-mono">{receiptOrder.order_number}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(receiptOrder.created_at), "MMM d, yyyy h:mm a")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{receiptOrder.payment_status === "unpaid" ? "Credit (Unpaid)" : receiptOrder.payment_method.replace("_", " ")}</span></div>
                {receiptOrder.payment_status === "unpaid" && (
                  <Badge variant="secondary" className="mt-1">CREDIT SALE</Badge>
                )}
              </div>

              <Separator />
              <div className="space-y-2 text-sm">
                {receiptOrder.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(receiptOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>{formatPrice(receiptOrder.tax)}</span></div>
                <div className="flex justify-between font-medium text-base pt-1"><span>Total</span><span className="font-serif">{formatPrice(receiptOrder.total)}</span></div>
                {receiptOrder.payment_status === "unpaid" && (
                  <div className="flex justify-between text-destructive font-medium"><span>Balance Due</span><span>{formatPrice(receiptOrder.total)}</span></div>
                )}
              </div>

              <Separator />
              <p className="text-center text-xs text-muted-foreground">Thank you for your purchase!</p>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                <Button className="flex-1" onClick={() => { setReceiptOrder(null); searchRef.current?.focus(); }}>New Sale</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-only receipt */}
      {receiptOrder && (
        <div className="hidden print:block p-4 max-w-[300px] mx-auto text-sm">
          <div className="text-center mb-4">
            <h2 className="font-bold text-lg">{businessName}</h2>
            {settings?.address && <p className="text-xs">{settings.address}, {settings?.city}</p>}
            {settings?.phone && <p className="text-xs">{settings.phone}</p>}
          </div>
          <p>Receipt #{receiptOrder.order_number}</p>
          <p>{format(new Date(receiptOrder.created_at), "MMM d, yyyy h:mm a")}</p>
          <p>Payment: {receiptOrder.payment_status === "unpaid" ? "CREDIT" : receiptOrder.payment_method.replace("_", " ")}</p>
          <hr className="my-2" />
          {receiptOrder.items.map((item) => (
            <div key={item.product_id} className="flex justify-between">
              <span>{item.name} ×{item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <hr className="my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(receiptOrder.subtotal)}</span></div>
          <div className="flex justify-between"><span>VAT</span><span>{formatPrice(receiptOrder.tax)}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(receiptOrder.total)}</span></div>
          {receiptOrder.payment_status === "unpaid" && (
            <div className="flex justify-between font-bold mt-1"><span>BALANCE DUE</span><span>{formatPrice(receiptOrder.total)}</span></div>
          )}
          <p className="text-center mt-4 text-xs">Thank you for your purchase!</p>
        </div>
      )}
    </>
  );
}
