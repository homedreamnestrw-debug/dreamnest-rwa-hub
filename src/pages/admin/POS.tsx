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
  Loader2, Receipt, X, Printer, MapPin, Clock, Percent, Gift,
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
  discount_amount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: string;
  created_at: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  amount_paid?: number;
}

export default function POS() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<CompletedOrder | null>(null);
  const [receiptFormat, setReceiptFormat] = useState<"thermal" | "a4">("thermal");
  const [customerNote, setCustomerNote] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [isCredit, setIsCredit] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTin, setCustomerTin] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; full_name: string | null; phone: string | null; user_id?: string; shipping_address?: string | null; email?: string | null; tin?: string | null; source?: string } | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerResolved, setCustomerResolved] = useState(false);
  const [amountPaid, setAmountPaid] = useState<string>("");
  // Discount
  const [discountType, setDiscountType] = useState<"none" | "percent" | "amount">("none");
  const [discountValue, setDiscountValue] = useState<string>("");
  // Voucher
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherData, setVoucherData] = useState<{ id: string; code: string; balance: number; expires_at: string } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
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

  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  const searchCustomer = useCallback(async (query: string) => {
    setCustomerPhone(query);
    setCustomerResolved(false);
    setSelectedCustomer(null);
    if (query.length < 3) {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    // Search both profiles (registered) and contacts (guest)
    const [profilesRes, contactsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, shipping_address")
        .or(`phone.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(5),
      supabase
        .from("contacts")
        .select("id, full_name, phone, email, shipping_address, tin")
        .or(`phone.ilike.%${query}%,full_name.ilike.%${query}%,tin.ilike.%${query}%`)
        .limit(5),
    ]);
    const profiles = (profilesRes.data ?? []).map((p: any) => ({ ...p, source: "registered" }));
    const contacts = (contactsRes.data ?? []).map((c: any) => ({ ...c, source: "guest" }));
    const combined = [...profiles, ...contacts];
    setCustomerSearchResults(combined);
    setShowCustomerDropdown(combined.length > 0);
  }, []);

  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerPhone(customer.phone || "");
    setCustomerName(customer.full_name || "");
    setCustomerAddress(customer.shipping_address || "");
    setCustomerEmail(customer.email || "");
    setCustomerTin(customer.tin || "");
    setShowCustomerDropdown(false);
    setCustomerResolved(true);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerPhone("");
    setCustomerName("");
    setCustomerAddress("");
    setCustomerEmail("");
    setCustomerTin("");
    setCustomerSearchResults([]);
    setCustomerResolved(false);
  };

  const vatRate = settings?.vat_percentage ? Number(settings.vat_percentage) / 100 : 0.18;
  const businessName = settings?.business_name ?? "DreamNest";
  const receiptLogoUrl = (settings as any)?.receipt_logo_url || settings?.logo_url || "";
  const receiptHeader = (settings as any)?.receipt_header || "";
  const receiptFooter = (settings as any)?.receipt_footer || "";

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
  const clearCart = () => { setCart([]); setCustomerNote(""); setIsCredit(false); setAmountPaid(""); setDiscountType("none"); setDiscountValue(""); setVoucherCode(""); setVoucherData(null); clearCustomer(); searchRef.current?.focus(); };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  
  // Calculate discount
  let discountAmount = 0;
  if (discountType === "percent" && discountValue) {
    discountAmount = Math.round(subtotal * Number(discountValue) / 100);
  } else if (discountType === "amount" && discountValue) {
    discountAmount = Math.min(Number(discountValue), subtotal);
  }
  
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * vatRate);
  const preVoucherTotal = afterDiscount + taxAmount;
  const voucherDiscount = voucherData ? Math.min(voucherData.balance, preVoucherTotal) : 0;
  const total = preVoucherTotal - voucherDiscount;
  const isFullyPaidByVoucher = voucherDiscount > 0 && total <= 0;

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_voucher", { voucher_code: voucherCode.trim() });
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Invalid, expired, or already redeemed voucher");
        return;
      }
      setVoucherData(data[0] as any);
      toast.success(`Voucher applied! Balance: ${formatPrice(data[0].balance)}`);
    } catch {
      toast.error("Could not validate voucher");
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => { setVoucherData(null); setVoucherCode(""); };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const paidAmount = isCredit && amountPaid ? Number(amountPaid) : 0;
      const effectivePaymentMethod = isFullyPaidByVoucher ? "voucher" as PaymentMethod : (isCredit && paidAmount <= 0 ? null : paymentMethod);
      const paymentStatus = isFullyPaidByVoucher ? "paid" : isCredit ? (paidAmount >= total ? "paid" : paidAmount > 0 ? "partial" : "unpaid") : "paid";
      const orderStatus = isCredit && paymentStatus !== "paid" ? "pending" : "delivered";

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: selectedCustomer?.user_id || null,
          guest_name: !selectedCustomer?.user_id && customerName ? customerName : null,
          guest_phone: !selectedCustomer?.user_id && customerPhone ? customerPhone : null,
          guest_email: !selectedCustomer?.user_id && customerEmail ? customerEmail : null,
          channel: "in_store" as const,
          status: orderStatus as any,
          payment_status: paymentStatus as any,
          payment_method: effectivePaymentMethod,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount + voucherDiscount,
          total: Math.max(0, total),
          notes: customerNote || null,
          location_id: selectedLocation || null,
          served_by: user?.id || null,
          shipping_address: customerAddress || null,
        })
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      // Auto-save new POS customer as contact
      if (!selectedCustomer && (customerPhone || customerEmail)) {
        await supabase.from("contacts").upsert({
          full_name: customerName || null,
          phone: customerPhone || null,
          email: customerEmail || null,
          shipping_address: customerAddress || null,
          tin: customerTin || null,
          source: "pos",
        }, { onConflict: "phone" }).then(() => {});
      }

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

      if (isCredit && paidAmount > 0) {
        await supabase.from("credit_payments").insert({
          order_id: order.id,
          amount: paidAmount,
          payment_method: paymentMethod,
          received_by: user?.id || null,
          note: "Initial payment at POS",
        });
      }

      // Record voucher redemption if used
      if (voucherData && voucherDiscount > 0) {
        await supabase.from("voucher_redemptions").insert({
          voucher_id: voucherData.id,
          order_id: order.id,
          amount_used: voucherDiscount,
        });
        const newBalance = voucherData.balance - voucherDiscount;
        await supabase
          .from("gift_vouchers")
          .update({
            balance: newBalance,
            status: newBalance <= 0 ? "redeemed" : "active",
          })
          .eq("id", voucherData.id);
      }

      // Auto-create receipt in invoices
      const receiptPayload = {
        document_number: "TEMP",
        document_type: "receipt" as const,
        order_id: order.id,
        customer_id: selectedCustomer?.user_id || null,
        subtotal,
        tax_rate: Math.round(vatRate * 100),
        tax_amount: taxAmount,
        discount: discountAmount + voucherDiscount,
        total: Math.max(0, total),
        status: (paymentStatus === "paid" ? "paid" : "sent") as any,
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        notes: customerNote || null,
      };
      await supabase.from("invoices").insert(receiptPayload);

      // Auto-create invoice items for the receipt
      const { data: createdReceipt } = await supabase
        .from("invoices")
        .select("id")
        .eq("order_id", order.id)
        .eq("document_type", "receipt")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (createdReceipt) {
        const invoiceItems = cart.map((i) => ({
          invoice_id: createdReceipt.id,
          description: i.name,
          quantity: i.quantity,
          unit_price: i.price,
          tax: Math.round(i.price * i.quantity * vatRate),
          total: i.price * i.quantity,
        }));
        await supabase.from("invoice_items").insert(invoiceItems);
      }

      setReceiptOrder({
        order_number: order.order_number,
        items: [...cart],
        subtotal,
        discount_amount: discountAmount + voucherDiscount,
        tax: taxAmount,
        total: Math.max(0, total),
        payment_method: isFullyPaidByVoucher ? "voucher" as PaymentMethod : paymentMethod,
        payment_status: paymentStatus,
        created_at: new Date().toISOString(),
        customer_name: selectedCustomer?.full_name || customerName || null,
        customer_phone: selectedCustomer?.phone || customerPhone || null,
        amount_paid: paidAmount,
      });

      toast.success(`Sale #${order.order_number} completed!${isCredit ? " (Credit)" : ""}${voucherDiscount > 0 ? " (Voucher applied)" : ""}`);
      setCart([]);
      setCustomerNote("");
      setIsCredit(false);
      setAmountPaid("");
      setDiscountType("none");
      setDiscountValue("");
      setVoucherCode("");
      setVoucherData(null);
      clearCustomer();
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

  // A4 Receipt component
  const A4Receipt = ({ order }: { order: CompletedOrder }) => (
    <div className="p-8 max-w-[210mm] mx-auto bg-white text-black text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header with logo */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {receiptLogoUrl && <img src={receiptLogoUrl} alt="Logo" className="h-16 object-contain" />}
          <div>
            <h1 className="text-2xl font-bold">{businessName}</h1>
            {settings?.tagline && <p className="text-gray-500 text-xs">{settings.tagline}</p>}
          </div>
        </div>
        <div className="text-right text-xs text-gray-600">
          {settings?.address && <p>{settings.address}</p>}
          {settings?.city && <p>{settings.city}, {(settings as any)?.country}</p>}
          {settings?.phone && <p>Tel: {settings.phone}</p>}
          {settings?.email && <p>{settings.email}</p>}
        </div>
      </div>

      {receiptHeader && <p className="text-center text-xs text-gray-600 mb-4 border-b pb-2">{receiptHeader}</p>}

      {/* Receipt info */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
        <div>
          <p><span className="text-gray-500">Receipt #:</span> <strong>{order.order_number}</strong></p>
          <p><span className="text-gray-500">Date:</span> {format(new Date(order.created_at), "MMM d, yyyy h:mm a")}</p>
          <p><span className="text-gray-500">Payment:</span> {order.payment_status === "unpaid" ? "Credit" : order.payment_status === "partial" ? "Partial" : order.payment_method.replace("_", " ")}</p>
        </div>
        <div>
          {order.customer_name && <p><span className="text-gray-500">Customer:</span> {order.customer_name}</p>}
          {order.customer_phone && <p><span className="text-gray-500">Phone:</span> {order.customer_phone}</p>}
        </div>
      </div>

      {/* Items table */}
      <table className="w-full mb-6 text-xs">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-left py-2 font-semibold">#</th>
            <th className="text-left py-2 font-semibold">Item</th>
            <th className="text-center py-2 font-semibold">Qty</th>
            <th className="text-right py-2 font-semibold">Unit Price</th>
            <th className="text-right py-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={item.product_id} className="border-b border-gray-200">
              <td className="py-2">{idx + 1}</td>
              <td className="py-2">{item.name}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatPrice(item.price)}</td>
              <td className="py-2 text-right">{formatPrice(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatPrice(order.discount_amount)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-gray-500">VAT ({Math.round(vatRate * 100)}%)</span><span>{formatPrice(order.tax)}</span></div>
          <div className="flex justify-between border-t-2 border-gray-800 pt-2 text-base font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          {order.amount_paid != null && order.amount_paid > 0 && (
            <div className="flex justify-between text-green-700 font-medium"><span>Amount Paid</span><span>{formatPrice(order.amount_paid)}</span></div>
          )}
          {(order.payment_status === "unpaid" || order.payment_status === "partial") && (
            <div className="flex justify-between text-red-600 font-bold"><span>Balance Due</span><span>{formatPrice(order.total - (order.amount_paid || 0))}</span></div>
          )}
        </div>
      </div>

      {receiptFooter && <p className="text-center text-xs text-gray-500 border-t pt-4 whitespace-pre-line">{receiptFooter}</p>}
      {!receiptFooter && <p className="text-center text-xs text-gray-500 border-t pt-4">Thank you for your purchase!</p>}
    </div>
  );

  // Thermal receipt component
  const ThermalReceipt = ({ order }: { order: CompletedOrder }) => (
    <div className="p-4 max-w-[300px] mx-auto text-sm">
      <div className="text-center mb-4">
        {receiptLogoUrl && <img src={receiptLogoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />}
        <h2 className="font-bold text-lg">{businessName}</h2>
        {settings?.address && <p className="text-xs">{settings.address}, {settings?.city}</p>}
        {settings?.phone && <p className="text-xs">{settings.phone}</p>}
        {receiptHeader && <p className="text-xs mt-1">{receiptHeader}</p>}
      </div>
      <p>Receipt #{order.order_number}</p>
      <p>{format(new Date(order.created_at), "MMM d, yyyy h:mm a")}</p>
      {order.customer_name && <p>Customer: {order.customer_name}</p>}
      {order.customer_phone && <p>Phone: {order.customer_phone}</p>}
      <p>Payment: {order.payment_status === "unpaid" ? "CREDIT" : order.payment_status === "partial" ? "PARTIAL" : order.payment_method.replace("_", " ")}</p>
      <hr className="my-2" />
      {order.items.map((item) => (
        <div key={item.product_id} className="flex justify-between">
          <span>{item.name} ×{item.quantity}</span>
          <span>{formatPrice(item.price * item.quantity)}</span>
        </div>
      ))}
      <hr className="my-2" />
      <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
      {order.discount_amount > 0 && (
        <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatPrice(order.discount_amount)}</span></div>
      )}
      <div className="flex justify-between"><span>VAT</span><span>{formatPrice(order.tax)}</span></div>
      <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
      {order.amount_paid != null && order.amount_paid > 0 && (
        <div className="flex justify-between mt-1"><span>PAID</span><span>{formatPrice(order.amount_paid)}</span></div>
      )}
      {(order.payment_status === "unpaid" || order.payment_status === "partial") && (
        <div className="flex justify-between font-bold mt-1"><span>BALANCE DUE</span><span>{formatPrice(order.total - (order.amount_paid || 0))}</span></div>
      )}
      <p className="text-center mt-4 text-xs">{receiptFooter || "Thank you for your purchase!"}</p>
    </div>
  );

  return (
    <>
      <div className="flex min-h-0 flex-col gap-4 print:hidden lg:h-[calc(100dvh-8rem)] lg:flex-row">
        {/* Left: Product search + grid */}
        <div className="flex min-h-0 flex-1 flex-col min-w-0">
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
        <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden lg:w-[380px]">
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

          <CardContent className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-0">
            <ScrollArea className="h-full min-h-0">
              <div className="space-y-4 pr-3">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    <Receipt className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    <p>No items in sale</p>
                    <p className="mt-1 text-xs">Search or click products to add</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.product_id} className="flex min-w-0 items-center gap-2 rounded-md bg-muted/50 p-2">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatPrice(item.price)} each</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                          </div>
                          <span className="shrink-0 text-right text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeFromCart(item.product_id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pb-1">
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Customer</p>
                        <div className="relative">
                          <Input
                            ref={customerSearchRef}
                            placeholder="Search phone, name, or TIN..."
                            value={customerPhone}
                            onChange={(e) => searchCustomer(e.target.value)}
                            onFocus={() => customerSearchResults.length > 0 && setShowCustomerDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                            className="h-8 text-sm"
                          />
                          {showCustomerDropdown && (
                            <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
                              {customerSearchResults.map((c: any) => (
                                <button
                                  key={`${c.source}-${c.id}`}
                                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted flex items-center gap-2"
                                  onMouseDown={() => selectCustomer(c)}
                                >
                                  <Badge variant={c.source === "registered" ? "default" : "outline"} className="text-[10px] px-1 py-0 shrink-0">
                                    {c.source === "registered" ? "Reg" : "Guest"}
                                  </Badge>
                                  <span className="truncate">{c.full_name || "—"}</span>
                                  <span className="text-muted-foreground text-xs ml-auto shrink-0">{c.phone || c.email || ""}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {selectedCustomer && (
                            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2" onClick={clearCustomer}><X className="h-3 w-3" /></Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-sm" disabled={!!selectedCustomer} />
                          <Input placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="h-8 text-sm" disabled={!!selectedCustomer} />
                          <Input placeholder="Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="h-8 text-sm" disabled={!!selectedCustomer} />
                          <Input placeholder="TIN (optional)" value={customerTin} onChange={(e) => setCustomerTin(e.target.value)} className="h-8 text-sm" disabled={!!selectedCustomer} />
                        </div>
                        {selectedCustomer && <p className="text-[11px] text-green-600">✓ {selectedCustomer.source === "registered" ? "Registered" : "Guest"} customer</p>}
                        {!selectedCustomer && customerPhone.length >= 6 && <p className="text-[11px] text-muted-foreground">New — auto-saved on checkout</p>}
                      </div>

                      <Input placeholder="Sale note (optional)" className="h-8 text-sm" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />

                      <div className="space-y-1.5 rounded-md border bg-muted/30 p-2">
                        <div className="flex items-center gap-2">
                          <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs font-medium">Discount</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Select value={discountType} onValueChange={(v) => { setDiscountType(v as any); setDiscountValue(""); }}>
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="amount">Amt</SelectItem>
                            </SelectContent>
                          </Select>
                          {discountType !== "none" && (
                            <Input
                              type="number"
                              placeholder={discountType === "percent" ? "%" : "RWF"}
                              value={discountValue}
                              onChange={(e) => setDiscountValue(e.target.value)}
                              className="h-8 flex-1 text-sm"
                              min={0}
                              max={discountType === "percent" ? 100 : subtotal}
                            />
                          )}
                        </div>
                        {discountAmount > 0 && (
                          <p className="text-[11px] text-red-600">-{formatPrice(discountAmount)}</p>
                        )}
                      </div>

                      {/* Voucher Code */}
                      <div className="space-y-1.5 rounded-md border bg-muted/30 p-2">
                        <div className="flex items-center gap-2">
                          <Gift className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs font-medium">Gift Voucher</p>
                        </div>
                        {voucherData ? (
                          <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20">
                            <div className="text-sm">
                              <span className="font-mono font-bold">{voucherData.code}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">-{formatPrice(voucherDiscount)}</Badge>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={removeVoucher}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter voucher code"
                              value={voucherCode}
                              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                              className="font-mono text-sm h-8"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={applyVoucher} disabled={voucherLoading}>
                              {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                            </Button>
                          </div>
                        )}
                      </div>

                      {!isFullyPaidByVoucher && (
                        <>
                          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Sell on Credit</p>
                                <p className="text-xs text-muted-foreground">Customer pays later</p>
                              </div>
                            </div>
                            <Switch checked={isCredit} onCheckedChange={(v) => { setIsCredit(v); if (!v) setAmountPaid(""); }} />
                          </div>

                          {isCredit && (
                            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                              <p className="text-xs font-medium text-muted-foreground">Amount Paid Now (optional)</p>
                              <Input type="number" placeholder="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="h-9 text-sm" min={0} max={total} />
                              {amountPaid && Number(amountPaid) > 0 && (
                                <p className="text-xs text-muted-foreground">Balance remaining: {formatPrice(total - Number(amountPaid))}</p>
                              )}
                            </div>
                          )}

                          {(!isCredit || (isCredit && amountPaid && Number(amountPaid) > 0)) && (
                            <div>
                              <p className="mb-2 text-xs font-medium text-muted-foreground">Payment Method</p>
                              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="grid grid-cols-2 gap-2">
                                {paymentMethods.map((pm) => (
                                  <label key={pm.value} className={`flex items-center gap-2 rounded-md border p-2.5 text-sm transition-colors cursor-pointer ${paymentMethod === pm.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                                    <RadioGroupItem value={pm.value} className="sr-only" />
                                    {pm.icon}
                                    <span className="font-medium">{pm.label}</span>
                                  </label>
                                ))}
                              </RadioGroup>
                            </div>
                          )}
                        </>
                      )}

                      {isFullyPaidByVoucher && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5">
                          <Gift className="h-5 w-5 text-primary" />
                          <div>
                            <span className="font-medium text-sm">Paid by Gift Voucher</span>
                            <p className="text-xs text-muted-foreground">Voucher covers the full amount</p>
                          </div>
                        </div>
                      )}

                      <Separator />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-red-600"><span>Discount{discountType === "percent" ? ` (${discountValue}%)` : ""}</span><span>-{formatPrice(discountAmount)}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-muted-foreground">VAT ({Math.round(vatRate * 100)}%)</span><span>{formatPrice(taxAmount)}</span></div>
                        {voucherDiscount > 0 && (
                          <div className="flex justify-between text-green-600"><span>Voucher</span><span>-{formatPrice(voucherDiscount)}</span></div>
                        )}
                        <Separator />
                        <div className="flex justify-between pt-1 text-lg font-medium"><span>Total</span><span className="font-serif">{formatPrice(Math.max(0, total))}</span></div>
                      </div>

                      <Button className="h-12 w-full text-base" onClick={handleCheckout} disabled={submitting} variant={isCredit ? "secondary" : "default"}>
                        {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>) : isFullyPaidByVoucher ? `Pay with Voucher` : isCredit ? `Sell on Credit — ${formatPrice(total)}` : `Complete Sale — ${formatPrice(total)}`}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptOrder} onOpenChange={() => setReceiptOrder(null)}>
        <DialogContent className={receiptFormat === "a4" ? "max-w-3xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center justify-between">
              <span>Sale Receipt</span>
              <div className="flex gap-2">
                <Button variant={receiptFormat === "thermal" ? "default" : "outline"} size="sm" onClick={() => setReceiptFormat("thermal")}>Thermal</Button>
                <Button variant={receiptFormat === "a4" ? "default" : "outline"} size="sm" onClick={() => setReceiptFormat("a4")}>A4</Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {receiptOrder && (
            <div id="receipt">
              {receiptFormat === "a4" ? (
                <A4Receipt order={receiptOrder} />
              ) : (
                <div className="space-y-4">
                  <div className="text-center border-b pb-4">
                    {receiptLogoUrl && <img src={receiptLogoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />}
                    <h3 className="font-serif text-xl font-semibold">{businessName}</h3>
                    {settings?.address && <p className="text-xs text-muted-foreground">{settings.address}, {settings?.city}</p>}
                    {settings?.phone && <p className="text-xs text-muted-foreground">{settings.phone}</p>}
                    {receiptHeader && <p className="text-xs text-muted-foreground mt-1">{receiptHeader}</p>}
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Receipt #</span><span className="font-mono">{receiptOrder.order_number}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{format(new Date(receiptOrder.created_at), "MMM d, yyyy h:mm a")}</span></div>
                    {receiptOrder.customer_name && <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{receiptOrder.customer_name}</span></div>}
                    {receiptOrder.customer_phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{receiptOrder.customer_phone}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{receiptOrder.payment_status === "unpaid" ? "Credit (Unpaid)" : receiptOrder.payment_status === "partial" ? "Partial Payment" : receiptOrder.payment_method.replace("_", " ")}</span></div>
                    {(receiptOrder.payment_status === "unpaid" || receiptOrder.payment_status === "partial") && <Badge variant="secondary" className="mt-1">CREDIT SALE</Badge>}
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
                    {receiptOrder.discount_amount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatPrice(receiptOrder.discount_amount)}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>{formatPrice(receiptOrder.tax)}</span></div>
                    <div className="flex justify-between font-medium text-base pt-1"><span>Total</span><span className="font-serif">{formatPrice(receiptOrder.total)}</span></div>
                    {receiptOrder.amount_paid != null && receiptOrder.amount_paid > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Amount Paid</span><span>{formatPrice(receiptOrder.amount_paid)}</span></div>}
                    {(receiptOrder.payment_status === "unpaid" || receiptOrder.payment_status === "partial") && <div className="flex justify-between text-destructive font-medium"><span>Balance Due</span><span>{formatPrice(receiptOrder.total - (receiptOrder.amount_paid || 0))}</span></div>}
                  </div>

                  <Separator />
                  <p className="text-center text-xs text-muted-foreground">{receiptFooter || "Thank you for your purchase!"}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 print:hidden">
                <Button variant="outline" className="flex-1" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                <Button className="flex-1" onClick={() => { setReceiptOrder(null); searchRef.current?.focus(); }}>New Sale</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print-only receipt */}
      {receiptOrder && (
        <div className="hidden print:block">
          {receiptFormat === "a4" ? (
            <A4Receipt order={receiptOrder} />
          ) : (
            <ThermalReceipt order={receiptOrder} />
          )}
        </div>
      )}
    </>
  );
}