import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

const formatRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

/**
 * Auto-create a receipt document (in invoices table) for an order.
 * Used when an online payment is approved or a POS sale completes.
 * Idempotent: skips if a receipt already exists for the order.
 */
export async function autoCreateReceiptForOrder(orderId: string): Promise<string | null> {
  // Skip if a receipt already exists
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .eq("document_type", "receipt")
    .maybeSingle();
  if (existing) return existing.id;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*, products(name)")
    .eq("order_id", orderId);

  const taxRate = order.subtotal > 0 ? Math.round((order.tax_amount / order.subtotal) * 100) : 0;

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({
      document_number: "TEMP",
      document_type: "receipt",
      order_id: orderId,
      customer_id: order.customer_id || null,
      subtotal: order.subtotal,
      tax_rate: taxRate,
      tax_amount: order.tax_amount,
      discount: order.discount_amount,
      total: order.total,
      status: order.payment_status === "paid" ? "paid" : "sent",
      paid_at: order.payment_status === "paid" ? new Date().toISOString() : null,
      notes: order.notes || null,
    })
    .select("id")
    .single();

  if (error || !created) return null;

  if (items && items.length > 0) {
    const invItems = items.map((i: any) => ({
      invoice_id: created.id,
      description: i.products?.name || "Item",
      quantity: i.quantity,
      unit_price: i.unit_price,
      tax: 0,
      total: i.total,
    }));
    await supabase.from("invoice_items").insert(invItems);
  }

  return created.id;
}

/**
 * Generate and download a PDF for any invoice/receipt/proforma/quote document.
 */
export async function downloadInvoicePdf(invoiceId: string) {
  const [{ data: invoice }, { data: items }, { data: settingsArr }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", invoiceId).single(),
    supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("created_at"),
    supabase.rpc("get_public_business_settings"),
  ]);

  if (!invoice) return;
  const settings = settingsArr?.[0];

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header — business info
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(settings?.business_name || "DreamNest", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(settings?.tagline || "", 14, 24);
  doc.text(`${settings?.address || ""}, ${settings?.city || ""}`.trim(), 14, 29);
  doc.text(`Tel: ${settings?.phone || ""}  Email: ${settings?.email || ""}`, 14, 34);

  // Document title (right aligned)
  const docType = (invoice.document_type as string).toUpperCase();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(docType, pageWidth - 14, 18, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`No: ${invoice.document_number}`, pageWidth - 14, 25, { align: "right" });
  doc.text(`Date: ${format(new Date(invoice.created_at), "MMM d, yyyy HH:mm")}`, pageWidth - 14, 30, { align: "right" });
  doc.text(`Status: ${(invoice.status as string).toUpperCase()}`, pageWidth - 14, 35, { align: "right" });

  // Items table
  const body = (items || []).map((it: any) => [
    it.description,
    String(it.quantity),
    formatRWF(it.unit_price),
    formatRWF(it.total),
  ]);
  if (body.length === 0) body.push(["—", "—", "—", "—"]);

  autoTable(doc, {
    startY: 50,
    head: [["Description", "Qty", "Unit Price", "Total"]],
    body,
    theme: "striped",
    headStyles: { fillColor: [120, 80, 50] },
    styles: { fontSize: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  doc.setFontSize(10);
  const tx = pageWidth - 14;
  let y = finalY;
  doc.text(`Subtotal: ${formatRWF(invoice.subtotal)}`, tx, y, { align: "right" }); y += 6;
  if (invoice.discount > 0) {
    doc.text(`Discount: -${formatRWF(invoice.discount)}`, tx, y, { align: "right" }); y += 6;
  }
  doc.text(`Tax (${invoice.tax_rate}%): ${formatRWF(invoice.tax_amount)}`, tx, y, { align: "right" }); y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL: ${formatRWF(invoice.total)}`, tx, y, { align: "right" });

  // Footer
  if (settings?.receipt_footer) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(settings.receipt_footer, pageWidth / 2, 285, { align: "center" });
  }

  doc.save(`${docType}-${invoice.document_number}.pdf`);
}

/**
 * Open WhatsApp share with a summary message for the given invoice.
 * If a phone is provided it pre-fills the recipient.
 */
export async function shareInvoiceOnWhatsApp(invoiceId: string, recipientPhone?: string) {
  const [{ data: invoice }, { data: settingsArr }] = await Promise.all([
    supabase.from("invoices").select("*, orders(guest_phone, guest_name)").eq("id", invoiceId).single(),
    supabase.rpc("get_public_business_settings"),
  ]);
  if (!invoice) return;
  const settings = settingsArr?.[0];
  const phone = (recipientPhone || (invoice as any).orders?.guest_phone || "").replace(/[^\d]/g, "");
  const docType = (invoice.document_type as string).toUpperCase();

  const lines = [
    `*${settings?.business_name || "DreamNest"}*`,
    `${docType} ${invoice.document_number}`,
    `Date: ${format(new Date(invoice.created_at), "MMM d, yyyy HH:mm")}`,
    `Total: ${formatRWF(invoice.total)}`,
    `Status: ${(invoice.status as string).toUpperCase()}`,
    "",
    "Thank you for your purchase!",
  ];
  const text = encodeURIComponent(lines.join("\n"));
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
