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
    .select("*, products(name), product_variants(variant_name, sku, attributes)")
    .eq("order_id", orderId);

  const taxRate = order.subtotal > 0 ? Math.round((order.tax_amount / order.subtotal) * 100) : 0;

  const { data: created, error } = await supabase
    .from("invoices")
    .insert({
      document_number: "AUTO", // overwritten by BEFORE INSERT trigger
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
    const invItems = items.map((i: any) => {
      const attrs = i.product_variants?.attributes as Record<string, string> | null | undefined;
      const variantLabel =
        i.product_variants?.variant_name ||
        (attrs ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(", ") : "");
      const baseName = i.products?.name || "Item";
      const description = variantLabel ? `${baseName} — ${variantLabel}` : baseName;
      return {
        invoice_id: created.id,
        description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax: 0,
        total: i.total,
      };
    });
    await supabase.from("invoice_items").insert(invItems);
  }

  return created.id;
}

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 200, h: 200 });
      img.src = dataUrl;
    });
    const format = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG";
    return { dataUrl, ...dims, format };
  } catch {
    return null;
  }
}

/**
 * Build a branded A4 PDF for an order or invoice/receipt.
 * Used by both downloadInvoicePdf and the POS download button.
 */
export async function buildOrderInvoicePdfFromData(opts: {
  documentType: string; // RECEIPT, INVOICE, PROFORMA, QUOTE
  documentNumber: string;
  createdAt: Date;
  status?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  paymentMethod?: string | null;
  servedBy?: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number; total: number }>;
  subtotal: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number | null;
  notes?: string | null;
}) {
  const { data: settingsArr } = await supabase.rpc("get_public_business_settings");
  const settings: any = settingsArr?.[0];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Logo
  const logoUrl = settings?.receipt_logo_url || settings?.logo_url;
  let headerBottom = 18;
  if (logoUrl) {
    const img = await loadImageAsDataUrl(logoUrl);
    if (img) {
      const maxH = 22;
      const ratio = img.w / img.h;
      const h = maxH;
      const w = h * ratio;
      try {
        doc.addImage(img.dataUrl, img.format, margin, 12, w, h);
        headerBottom = 12 + h;
      } catch {
        // ignore
      }
    }
  }

  // Business info — to the right of the logo (or at left if no logo)
  const businessLeft = logoUrl ? margin + 28 : margin;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(settings?.business_name || "DreamNest", businessLeft, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (settings?.tagline) doc.text(settings.tagline, businessLeft, 23);

  // Address right side
  doc.setFontSize(8.5);
  const rx = pageWidth - margin;
  let ry = 14;
  if (settings?.address) { doc.text(settings.address, rx, ry, { align: "right" }); ry += 4; }
  if (settings?.city) { doc.text(`${settings.city}${settings?.country ? ", " + settings.country : ""}`, rx, ry, { align: "right" }); ry += 4; }
  if (settings?.phone) { doc.text(`Tel: ${settings.phone}`, rx, ry, { align: "right" }); ry += 4; }
  if (settings?.email) { doc.text(settings.email, rx, ry, { align: "right" }); ry += 4; }

  let y = Math.max(headerBottom, ry) + 4;
  doc.setDrawColor(120, 80, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Document title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(opts.documentType.toUpperCase(), margin, y + 2);

  // Right side: doc meta
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  let my = y - 2;
  doc.text(`No: ${opts.documentNumber}`, rx, my, { align: "right" }); my += 5;
  doc.text(`Date: ${format(opts.createdAt, "MMM d, yyyy HH:mm")}`, rx, my, { align: "right" }); my += 5;
  if (opts.status) { doc.text(`Status: ${opts.status.toUpperCase()}`, rx, my, { align: "right" }); my += 5; }
  if (opts.paymentMethod) { doc.text(`Payment: ${opts.paymentMethod.replace(/_/g, " ")}`, rx, my, { align: "right" }); }

  y = Math.max(y + 6, my + 2);

  // Customer block
  if (opts.customerName || opts.customerPhone || opts.customerEmail) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", margin, y + 4);
    doc.setFont("helvetica", "normal");
    let cy = y + 9;
    if (opts.customerName) { doc.text(opts.customerName, margin, cy); cy += 4.5; }
    if (opts.customerPhone) { doc.text(opts.customerPhone, margin, cy); cy += 4.5; }
    if (opts.customerEmail) { doc.text(opts.customerEmail, margin, cy); cy += 4.5; }
    if (opts.servedBy) { doc.text(`Served by: ${opts.servedBy}`, margin, cy); cy += 4.5; }
    y = Math.max(y + 12, cy);
  } else {
    y += 4;
  }

  // Items table
  const body = opts.items.map((it, idx) => [
    String(idx + 1),
    it.description,
    String(it.quantity),
    formatRWF(it.unit_price),
    formatRWF(it.total),
  ]);
  if (body.length === 0) body.push(["—", "—", "—", "—", "—"]);

  autoTable(doc, {
    startY: y + 2,
    head: [["#", "Description", "Qty", "Unit Price", "Total"]],
    body,
    theme: "striped",
    headStyles: { fillColor: [120, 80, 50], textColor: 255 },
    styles: { fontSize: 9.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  const tx = pageWidth - margin;
  const labelX = pageWidth - margin - 50;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", labelX, finalY); doc.text(formatRWF(opts.subtotal), tx, finalY, { align: "right" }); finalY += 5;
  if (opts.discount && opts.discount > 0) {
    doc.text("Discount", labelX, finalY); doc.text(`-${formatRWF(opts.discount)}`, tx, finalY, { align: "right" }); finalY += 5;
  }
  if (opts.taxAmount && opts.taxAmount > 0) {
    doc.text(`VAT (${opts.taxRate || 18}%)`, labelX, finalY);
    doc.text(formatRWF(opts.taxAmount), tx, finalY, { align: "right" });
    finalY += 5;
  }
  doc.setDrawColor(0); doc.setLineWidth(0.3);
  doc.line(labelX, finalY, tx, finalY); finalY += 5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("TOTAL", labelX, finalY); doc.text(formatRWF(opts.total), tx, finalY, { align: "right" });
  finalY += 6;
  if (opts.amountPaid != null && opts.amountPaid > 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text("Amount Paid", labelX, finalY); doc.text(formatRWF(opts.amountPaid), tx, finalY, { align: "right" }); finalY += 5;
    const balance = opts.total - opts.amountPaid;
    if (balance > 0) {
      doc.setFont("helvetica", "bold"); doc.setTextColor(180, 0, 0);
      doc.text("Balance Due", labelX, finalY); doc.text(formatRWF(balance), tx, finalY, { align: "right" });
      doc.setTextColor(0); finalY += 5;
    }
  }

  // Notes
  if (opts.notes) {
    finalY += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("Notes:", margin, finalY); finalY += 4;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(opts.notes, pageWidth - margin * 2);
    doc.text(lines, margin, finalY);
  }

  // Footer (skip for proforma / quote documents)
  const docTypeLower = opts.documentType.toLowerCase();
  if (docTypeLower !== "proforma" && docTypeLower !== "quote") {
    const footerText = settings?.receipt_footer || "Thank you for your purchase!";
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(100);
    doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: "center" });
  }

  doc.save(`${opts.documentType.toUpperCase()}-${opts.documentNumber}.pdf`);
}

/**
 * Generate and download a PDF for any invoice/receipt/proforma/quote document.
 */
export async function downloadInvoicePdf(invoiceId: string) {
  const [{ data: invoice }, { data: items }, { data: order }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", invoiceId).single(),
    supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("created_at"),
    supabase.from("invoices").select("orders(order_number, guest_name, guest_phone, guest_email, payment_method)").eq("id", invoiceId).maybeSingle().then(r => ({ data: (r.data as any)?.orders })),
  ]);

  if (!invoice) return;

  await buildOrderInvoicePdfFromData({
    documentType: invoice.document_type as string,
    documentNumber: invoice.document_number,
    createdAt: new Date(invoice.created_at),
    status: invoice.status as string,
    customerName: (invoice as any).client_name || order?.guest_name || null,
    customerPhone: (invoice as any).client_phone || order?.guest_phone || null,
    customerEmail: (invoice as any).client_email || order?.guest_email || null,
    paymentMethod: order?.payment_method || null,
    items: (items || []).map((it: any) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total: it.total,
    })),
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxRate: invoice.tax_rate,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    notes: invoice.notes || null,
  });
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
