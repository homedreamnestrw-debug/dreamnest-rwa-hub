import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PreviewProps {
  invoiceId: string | null;
  // For virtual (not-yet-generated) rows we render straight from data
  fallback?: {
    document_number: string;
    document_type: string;
    status: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount: number;
    total: number;
    notes?: string | null;
    created_at: string;
    paid_at?: string | null;
    due_date?: string | null;
    order_id?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
    client_email?: string | null;
    client_address?: string | null;
  };
}

const formatRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

export function InvoicePreview({ invoiceId, fallback }: PreviewProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: settingsArr }] = await Promise.all([
        supabase.rpc("get_public_business_settings"),
      ]);
      if (cancelled) return;
      setSettings(settingsArr?.[0] || null);

      if (invoiceId && !invoiceId.startsWith("virtual-")) {
        const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
        const { data: its } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("created_at");
        if (cancelled) return;
        setInvoice(inv);
        setItems(its || []);
        if (inv?.order_id) {
          const { data: ord } = await supabase
            .from("orders")
            .select("order_number, guest_name, guest_phone, guest_email, payment_method, channel")
            .eq("id", inv.order_id)
            .maybeSingle();
          if (!cancelled) setOrder(ord);
        }
      } else if (fallback?.order_id) {
        // Virtual: build items list straight from order_items
        const [{ data: ord }, { data: ois }] = await Promise.all([
          supabase
            .from("orders")
            .select("order_number, guest_name, guest_phone, guest_email, payment_method, channel")
            .eq("id", fallback.order_id)
            .maybeSingle(),
          supabase
            .from("order_items")
            .select("quantity, unit_price, total, products(name), product_variants(variant_name, attributes)")
            .eq("order_id", fallback.order_id),
        ]);
        if (cancelled) return;
        setOrder(ord);
        setItems(
          (ois || []).map((it: any) => {
            const attrs = it.product_variants?.attributes as Record<string, string> | null;
            const variantLabel =
              it.product_variants?.variant_name ||
              (attrs ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(", ") : "");
            const baseName = it.products?.name || "Item";
            return {
              description: variantLabel ? `${baseName} — ${variantLabel}` : baseName,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total: it.total,
            };
          })
        );
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceId, fallback?.order_id]);

  const data = invoice || fallback;
  if (!data) return <p className="text-sm text-muted-foreground py-6 text-center">Loading preview...</p>;

  const docType = (data.document_type as string).toUpperCase();
  const businessName = settings?.business_name || "DreamNest";
  const tagline = settings?.tagline;
  const address = settings?.address;
  const city = settings?.city;
  const country = settings?.country;
  const phone = settings?.phone;
  const email = settings?.email;
  const logoUrl = settings?.receipt_logo_url || settings?.logo_url;
  const isProforma = (data.document_type as string) === "proforma" || (data.document_type as string) === "quote";
  const footer = isProforma ? null : (settings?.receipt_footer || "Thank you for your purchase!");
  // Prefer client_* fields stored directly on the invoice, fall back to linked order guest_* fields
  const clientName = (data as any).client_name || order?.guest_name;
  const clientPhone = (data as any).client_phone || order?.guest_phone;
  const clientEmail = (data as any).client_email || order?.guest_email;
  const clientAddress = (data as any).client_address;

  return (
    <Tabs defaultValue="a4" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="a4">A4 Format</TabsTrigger>
        <TabsTrigger value="thermal">Thermal Receipt</TabsTrigger>
      </TabsList>

      {/* A4 PREVIEW */}
      <TabsContent value="a4">
        <div className="bg-white text-black mx-auto shadow-md border rounded-sm" style={{ width: "100%", maxWidth: 720, padding: "32px 36px", fontFamily: "Helvetica, Arial, sans-serif" }}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b-2" style={{ borderColor: "hsl(28 35% 35%)" }}>
            <div className="flex items-start gap-3">
              {logoUrl && <img src={logoUrl} alt="logo" className="h-14 w-auto object-contain" />}
              <div>
                <h2 className="font-serif text-xl font-bold">{businessName}</h2>
                {tagline && <p className="text-xs text-gray-600">{tagline}</p>}
              </div>
            </div>
            <div className="text-right text-[11px] leading-snug text-gray-700">
              {address && <div>{address}</div>}
              {(city || country) && <div>{city}{city && country ? ", " : ""}{country}</div>}
              {phone && <div>Tel: {phone}</div>}
              {email && <div>{email}</div>}
            </div>
          </div>

          {/* Title + meta */}
          <div className="flex items-start justify-between mt-5">
            <h1 className="text-2xl font-bold tracking-wide">{docType}</h1>
            <div className="text-right text-xs space-y-0.5">
              <div><span className="text-gray-500">No: </span><span className="font-mono font-semibold">{data.document_number}</span></div>
              <div><span className="text-gray-500">Date: </span>{format(new Date(data.created_at), "MMM d, yyyy HH:mm")}</div>
              <div><span className="text-gray-500">Status: </span><span className="uppercase font-semibold">{data.status}</span></div>
              {order?.payment_method && <div><span className="text-gray-500">Payment: </span>{String(order.payment_method).replace(/_/g, " ")}</div>}
            </div>
          </div>

          {/* Bill To */}
          {(clientName || clientPhone || clientEmail || clientAddress) && (
            <div className="mt-4 text-xs">
              <div className="font-semibold mb-1">Bill To:</div>
              {clientName && <div>{clientName}</div>}
              {clientPhone && <div>{clientPhone}</div>}
              {clientEmail && <div>{clientEmail}</div>}
              {clientAddress && <div>{clientAddress}</div>}
            </div>
          )}

          {/* Items */}
          <table className="w-full mt-5 text-xs border-collapse">
            <thead>
              <tr style={{ background: "hsl(28 35% 35%)", color: "white" }}>
                <th className="text-left p-2 w-8">#</th>
                <th className="text-left p-2">Description</th>
                <th className="text-center p-2 w-12">Qty</th>
                <th className="text-right p-2 w-28">Unit Price</th>
                <th className="text-right p-2 w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-4 text-gray-400">No line items</td></tr>
              ) : items.map((it, idx) => (
                <tr key={idx} className={idx % 2 ? "bg-gray-50" : ""}>
                  <td className="p-2 align-top">{idx + 1}</td>
                  <td className="p-2 align-top">{it.description}</td>
                  <td className="p-2 text-center align-top">{it.quantity}</td>
                  <td className="p-2 text-right align-top">{formatRWF(it.unit_price)}</td>
                  <td className="p-2 text-right align-top">{formatRWF(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-64 text-xs space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatRWF(data.subtotal)}</span></div>
              {data.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatRWF(data.discount)}</span></div>}
              {data.tax_amount > 0 && <div className="flex justify-between"><span>VAT ({data.tax_rate}%)</span><span>{formatRWF(data.tax_amount)}</span></div>}
              <div className="border-t border-black mt-1 pt-1 flex justify-between font-bold text-sm"><span>TOTAL</span><span>{formatRWF(data.total)}</span></div>
            </div>
          </div>

          {data.notes && (
            <div className="mt-5 text-xs">
              <div className="font-semibold">Notes:</div>
              <div className="text-gray-700 whitespace-pre-wrap">{data.notes}</div>
            </div>
          )}

          {footer && <div className="text-center text-xs italic text-gray-500 mt-8 pt-3 border-t">{footer}</div>}
        </div>
      </TabsContent>

      {/* THERMAL PREVIEW */}
      <TabsContent value="thermal">
        <div className="bg-white text-black mx-auto shadow-md border" style={{ width: 300, padding: "14px 12px", fontFamily: "'Courier New', monospace", fontSize: 11, lineHeight: 1.35 }}>
          <div className="text-center">
            {logoUrl && <img src={logoUrl} alt="logo" className="h-10 w-auto mx-auto object-contain mb-1" />}
            <div className="font-bold text-sm">{businessName}</div>
            {tagline && <div className="text-[10px]">{tagline}</div>}
            {address && <div className="text-[10px]">{address}</div>}
            {(city || country) && <div className="text-[10px]">{city}{city && country ? ", " : ""}{country}</div>}
            {phone && <div className="text-[10px]">Tel: {phone}</div>}
          </div>

          <div className="border-t border-dashed border-black my-2" />

          <div className="text-center font-bold uppercase">{docType}</div>
          <div className="flex justify-between"><span>No:</span><span className="font-mono">{data.document_number}</span></div>
          <div className="flex justify-between"><span>Date:</span><span>{format(new Date(data.created_at), "MMM d HH:mm")}</span></div>
          <div className="flex justify-between"><span>Status:</span><span className="uppercase">{data.status}</span></div>
          {order?.payment_method && <div className="flex justify-between"><span>Payment:</span><span>{String(order.payment_method).replace(/_/g, " ")}</span></div>}
          {order?.guest_name && <div className="mt-1">Customer: {order.guest_name}</div>}
          {order?.guest_phone && <div>Phone: {order.guest_phone}</div>}

          <div className="border-t border-dashed border-black my-2" />

          {items.length === 0 ? (
            <div className="text-center text-gray-400">No line items</div>
          ) : items.map((it, idx) => (
            <div key={idx} className="mb-1.5">
              <div className="font-semibold">{it.description}</div>
              <div className="flex justify-between">
                <span>{it.quantity} × {formatRWF(it.unit_price)}</span>
                <span>{formatRWF(it.total)}</span>
              </div>
            </div>
          ))}

          <div className="border-t border-dashed border-black my-2" />

          <div className="flex justify-between"><span>Subtotal</span><span>{formatRWF(data.subtotal)}</span></div>
          {data.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatRWF(data.discount)}</span></div>}
          {data.tax_amount > 0 && <div className="flex justify-between"><span>VAT ({data.tax_rate}%)</span><span>{formatRWF(data.tax_amount)}</span></div>}
          <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1"><span>TOTAL</span><span>{formatRWF(data.total)}</span></div>

          <div className="border-t border-dashed border-black my-2" />
          {footer && <div className="text-center italic text-[10px]">{footer}</div>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
