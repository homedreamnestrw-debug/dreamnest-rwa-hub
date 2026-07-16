import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Eye, Pencil, History, Download, Share2, FileText, Store, Globe, X, Package, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { TIMELINE_LABELS, TIMELINE_ORDER, TimelinePreset, rangeFromPreset, inRange } from "@/lib/timelineFilter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { downloadInvoicePdf, shareInvoiceOnWhatsApp } from "@/lib/receiptUtils";
import { InvoicePreview } from "@/components/admin/InvoicePreview";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;

// A row that represents either a real invoice OR an unbilled order (auto-listed)
type InvoiceRow = Invoice & {
  _virtual?: boolean;
  _order_channel?: "online" | "in_store" | null;
  _order_number?: number | null;
  _order_id?: string | null;
};

const docTypes = Constants.public.Enums.document_type;
const docStatuses = Constants.public.Enums.document_status;

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
  accepted: "default",
  declined: "destructive",
  expired: "secondary",
};

const formatRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [timeline, setTimeline] = useState<TimelinePreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<InvoiceRow | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  type LineItem = { description: string; quantity: number; unit_price: number; product_id?: string | null };
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number; sku: string | null }[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [form, setForm] = useState({
    document_type: "proforma" as Invoice["document_type"],
    status: "draft" as Invoice["status"],
    tax_rate: 18,
    discount: 0,
    due_date: "",
    payment_terms: "",
    notes: "",
    client_name: "",
    client_phone: "",
    client_email: "",
    client_address: "",
  });

  const [editForm, setEditForm] = useState({
    tax_rate: 18,
    discount: 0,
    due_date: "",
    notes: "",
    status: "draft" as Invoice["status"],
    client_name: "",
    client_phone: "",
    client_email: "",
    client_address: "",
  });
  const [editLineItems, setEditLineItems] = useState<LineItem[]>([]);
  const [editProductPickerOpen, setEditProductPickerOpen] = useState(false);

  const editSubtotal = editLineItems.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const { tax_amount: editTaxAmount, total: editTotal } = (() => {
    const taxAmount = Math.round(editSubtotal * editForm.tax_rate / 100);
    return { tax_amount: taxAmount, total: editSubtotal + taxAmount - editForm.discount };
  })();

  const fetchData = async () => {
    setLoading(true);
    // Fetch all real invoices/receipts
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch orders so we can auto-list those without an invoice/receipt yet
    const { data: orderData } = await supabase
      .from("orders")
      .select("id, order_number, channel, total, subtotal, tax_amount, discount_amount, status, payment_status, payment_approved, notes, created_at, customer_id")
      .order("created_at", { ascending: false });

    const billedOrderIds = new Set((invoiceData || []).filter(i => i.order_id).map(i => i.order_id as string));
    const orderById = new Map((orderData || []).map(o => [o.id, o] as const));

    const virtualRows: InvoiceRow[] = (orderData || [])
      .filter(o => !billedOrderIds.has(o.id))
      .map((o) => {
        const isOnline = o.channel === "online";
        const docType: Invoice["document_type"] = isOnline ? "invoice" : "receipt";
        const status: Invoice["status"] =
          o.status === "cancelled" ? "cancelled" :
          o.payment_status === "paid" ? "paid" :
          isOnline ? "sent" : "draft";
        return {
          id: `virtual-${o.id}`,
          document_number: `${isOnline ? "INV" : "REC"}-#${o.order_number}`,
          document_type: docType,
          status,
          subtotal: o.subtotal,
          tax_rate: 18,
          tax_amount: o.tax_amount,
          discount: o.discount_amount,
          total: o.total,
          due_date: null,
          paid_at: o.payment_status === "paid" ? o.created_at : null,
          notes: o.notes,
          customer_id: o.customer_id,
          order_id: o.id,
          created_at: o.created_at,
          updated_at: o.created_at,
          _virtual: true,
          _order_channel: o.channel,
          _order_number: o.order_number,
          _order_id: o.id,
        } as InvoiceRow;
      });

    const realRows: InvoiceRow[] = (invoiceData || []).map((inv) => {
      const o = inv.order_id ? orderById.get(inv.order_id) : null;
      return {
        ...inv,
        _order_channel: (o?.channel as "online" | "in_store" | null) ?? null,
        _order_number: o?.order_number ?? null,
        _order_id: o?.id ?? null,
      } as InvoiceRow;
    });

    // Merge & sort by created_at desc
    const merged = [...realRows, ...virtualRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setInvoices(merged);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    (async () => {
      const { data } = await supabase.from("products").select("id, name, price, sku").eq("is_active", true).order("name");
      setProducts(data || []);
    })();
  }, [dialogOpen]);

  const recalculate = (subtotal: number, taxRate: number, discount: number) => {
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return { tax_amount: taxAmount, total };
  };

  const subtotalFromItems = lineItems.reduce((s, it) => s + (it.quantity * it.unit_price), 0);
  const { tax_amount: formTaxAmount, total: formTotal } = recalculate(subtotalFromItems, form.tax_rate, form.discount);

  const addEditProductLine = (p: { id: string; name: string; price: number }) => {
    setEditLineItems((prev) => [...prev, { description: p.name, quantity: 1, unit_price: Number(p.price) || 0, product_id: p.id }]);
    setEditProductPickerOpen(false);
  };
  const addEditCustomLine = () => setEditLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, product_id: null }]);
  const updateEditLine = (idx: number, patch: Partial<LineItem>) =>
    setEditLineItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeEditLine = (idx: number) => setEditLineItems((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setForm({ document_type: "proforma", status: "draft", tax_rate: 18, discount: 0, due_date: "", payment_terms: "", notes: "", client_name: "", client_phone: "", client_email: "", client_address: "" });
    setLineItems([]);
  };

  const addProductLine = (p: { id: string; name: string; price: number }) => {
    setLineItems((prev) => [...prev, { description: p.name, quantity: 1, unit_price: Number(p.price) || 0, product_id: p.id }]);
    setProductPickerOpen(false);
  };
  const addCustomLine = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, product_id: null }]);
  };
  const updateLine = (idx: number, patch: Partial<LineItem>) => {
    setLineItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeLine = (idx: number) => setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (lineItems.length === 0) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }
    if (lineItems.some(it => !it.description.trim())) { toast({ title: "All items need a description", variant: "destructive" }); return; }

    const combinedNotes = [
      form.payment_terms ? `Payment terms: ${form.payment_terms}` : "",
      form.notes,
    ].filter(Boolean).join("\n\n");

    const payload: TablesInsert<"invoices"> = {
      document_number: "AUTO",
      document_type: form.document_type,
      status: form.status,
      subtotal: subtotalFromItems,
      tax_rate: form.tax_rate,
      tax_amount: formTaxAmount,
      discount: form.discount,
      total: formTotal,
      due_date: form.due_date || null,
      notes: combinedNotes || null,
      client_name: form.client_name.trim() || null,
      client_phone: form.client_phone.trim() || null,
      client_email: form.client_email.trim() || null,
      client_address: form.client_address.trim() || null,
    };
    const { data: created, error } = await supabase.from("invoices").insert(payload).select("id").single();
    if (error || !created) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }

    const items = lineItems.map(it => ({
      invoice_id: created.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      tax: 0,
      total: it.quantity * it.unit_price,
    }));
    await supabase.from("invoice_items").insert(items);

    toast({ title: "Document created" });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const updateStatus = async (id: string, status: Invoice["status"]) => {
    const invoice = invoices.find(i => i.id === id);
    const update: any = { status };
    if (status === "paid") update.paid_at = new Date().toISOString();
    const { error } = await supabase.from("invoices").update(update).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // Audit log
    if (invoice) {
      await supabase.from("invoice_audit_log" as any).insert({
        invoice_id: id,
        field_name: "status",
        old_value: invoice.status,
        new_value: status,
        changed_by: user?.id || null,
      });
    }
    toast({ title: `Status updated to ${status}` });
    fetchData();
  };

  const openEdit = async (inv: Invoice) => {
    setEditing(inv);
    setEditForm({
      tax_rate: Number(inv.tax_rate),
      discount: inv.discount,
      due_date: inv.due_date || "",
      notes: inv.notes || "",
      status: inv.status,
      client_name: (inv as any).client_name || "",
      client_phone: (inv as any).client_phone || "",
      client_email: (inv as any).client_email || "",
      client_address: (inv as any).client_address || "",
    });
    if (products.length === 0) {
      const { data: prods } = await supabase.from("products").select("id, name, price, sku").eq("is_active", true).order("name");
      setProducts(prods || []);
    }
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("created_at");
    setInvoiceItems(data || []);
    setEditLineItems((data || []).map((it: any) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price: Number(it.unit_price),
      product_id: null,
    })));
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (editLineItems.length === 0) { toast({ title: "Add at least one line item", variant: "destructive" }); return; }
    if (editLineItems.some(it => !it.description.trim())) { toast({ title: "All items need a description", variant: "destructive" }); return; }

    const newSubtotal = editSubtotal;
    const newTaxAmount = editTaxAmount;
    const newTotal = editTotal;

    const changes: { field: string; old_val: string; new_val: string }[] = [];
    const compare: Array<[string, any, any]> = [
      ["subtotal", editing.subtotal, newSubtotal],
      ["tax_rate", editing.tax_rate, editForm.tax_rate],
      ["discount", editing.discount, editForm.discount],
      ["total", editing.total, newTotal],
      ["due_date", editing.due_date || "", editForm.due_date],
      ["notes", editing.notes || "", editForm.notes],
      ["status", editing.status, editForm.status],
      ["client_name", (editing as any).client_name || "", editForm.client_name],
      ["client_phone", (editing as any).client_phone || "", editForm.client_phone],
      ["client_email", (editing as any).client_email || "", editForm.client_email],
      ["client_address", (editing as any).client_address || "", editForm.client_address],
    ];
    for (const [f, oldV, newV] of compare) {
      if (String(oldV ?? "") !== String(newV ?? "")) changes.push({ field: f, old_val: String(oldV ?? ""), new_val: String(newV ?? "") });
    }

    const update: any = {
      subtotal: newSubtotal,
      tax_rate: editForm.tax_rate,
      tax_amount: newTaxAmount,
      discount: editForm.discount,
      total: newTotal,
      due_date: editForm.due_date || null,
      notes: editForm.notes || null,
      status: editForm.status,
      client_name: editForm.client_name.trim() || null,
      client_phone: editForm.client_phone.trim() || null,
      client_email: editForm.client_email.trim() || null,
      client_address: editForm.client_address.trim() || null,
    };
    if (editForm.status === "paid" && editing.status !== "paid") update.paid_at = new Date().toISOString();

    const { error } = await supabase.from("invoices").update(update).eq("id", editing.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    await supabase.from("invoice_items").delete().eq("invoice_id", editing.id);
    const items = editLineItems.map(it => ({
      invoice_id: editing.id,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      tax: 0,
      total: it.quantity * it.unit_price,
    }));
    if (items.length) await supabase.from("invoice_items").insert(items);

    if (changes.length > 0) {
      const logs = changes.map(c => ({
        invoice_id: editing.id,
        field_name: c.field,
        old_value: c.old_val,
        new_value: c.new_val,
        changed_by: user?.id || null,
      }));
      await supabase.from("invoice_audit_log" as any).insert(logs);
    }

    toast({ title: "Document updated" });
    setEditing(null);
    fetchData();
  };

  const fetchAuditLog = async (invoiceId: string) => {
    const { data } = await supabase.from("invoice_audit_log" as any).select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false });
    setAuditLog(data || []);
    setShowAudit(true);
  };

  // Materialise a virtual row (an order without an invoice yet) into a real DB record.
  // Returns the new real invoice id (or null on failure).
  const generateFromOrder = async (row: InvoiceRow, opts?: { silent?: boolean }): Promise<string | null> => {
    if (!row._order_id) return null;
    setGeneratingId(row.id);
    const isOnline = row._order_channel === "online";
    const docType: Invoice["document_type"] = isOnline ? "invoice" : "receipt";

    // Re-check: maybe a real invoice already exists for this order (race / re-click)
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("order_id", row._order_id)
      .eq("document_type", docType)
      .maybeSingle();
    if (existing) {
      setGeneratingId(null);
      if (!opts?.silent) { toast({ title: "Document already exists" }); fetchData(); }
      return existing.id;
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("quantity, unit_price, total, products(name), product_variants(variant_name, sku, attributes)")
      .eq("order_id", row._order_id);

    // document_number is auto-assigned by the BEFORE INSERT trigger; we send a placeholder
    // because the column is NOT NULL. The trigger overwrites it with a unique number.
    const payload: TablesInsert<"invoices"> = {
      document_number: "AUTO",
      document_type: docType,
      order_id: row._order_id,
      customer_id: row.customer_id,
      subtotal: row.subtotal,
      tax_rate: Number(row.tax_rate),
      tax_amount: row.tax_amount,
      discount: row.discount,
      total: row.total,
      status: row.status,
      paid_at: row.paid_at,
      notes: row.notes,
    };
    const { data: created, error } = await supabase
      .from("invoices")
      .insert(payload)
      .select("id")
      .single();

    if (error || !created) {
      setGeneratingId(null);
      if (!opts?.silent) toast({ title: "Error", description: error?.message ?? "Failed to generate", variant: "destructive" });
      return null;
    }

    if (orderItems && orderItems.length > 0) {
      const items = orderItems.map((it: any) => {
        const attrs = it.product_variants?.attributes as Record<string, string> | null | undefined;
        const variantLabel =
          it.product_variants?.variant_name ||
          (attrs ? Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(", ") : "");
        const baseName = it.products?.name || "Item";
        const description = variantLabel ? `${baseName} — ${variantLabel}` : baseName;
        return {
          invoice_id: created.id,
          description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          tax: 0,
          total: it.total,
        };
      });
      await supabase.from("invoice_items").insert(items);
    }

    setGeneratingId(null);
    if (!opts?.silent) toast({ title: `${isOnline ? "Invoice" : "Receipt"} generated` });
    await fetchData();
    return created.id;
  };

  // Resolve a row to a real invoice id, materialising it if it is a virtual one.
  const resolveRealId = async (row: InvoiceRow): Promise<string | null> => {
    if (!row._virtual) return row.id;
    return await generateFromOrder(row, { silent: true });
  };

  const handleDownload = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (id) downloadInvoicePdf(id);
  };

  const handleShare = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (id) shareInvoiceOnWhatsApp(id);
  };

  const handleMarkPaid = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (id) updateStatus(id, "paid");
  };

  const handleMarkSent = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (id) updateStatus(id, "sent");
  };

  const handleCancel = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (id) updateStatus(id, "cancelled");
  };

  const handleEdit = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (!id) return;
    const { data } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (data) openEdit(data);
  };

  const handleAudit = async (row: InvoiceRow) => {
    const id = await resolveRealId(row);
    if (id) fetchAuditLog(id);
  };

  const range = useMemo(
    () => rangeFromPreset(timeline, { from: customFrom, to: customTo }),
    [timeline, customFrom, customTo]
  );

  const filtered = useMemo(() => {
    const list = invoices.filter((inv) => {
      if (filterType !== "all" && inv.document_type !== filterType) return false;
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (filterSource !== "all") {
        const channel = inv._order_channel;
        if (filterSource === "online" && channel !== "online") return false;
        if (filterSource === "pos" && channel !== "in_store") return false;
        if (filterSource === "manual" && (channel === "online" || channel === "in_store" || inv.order_id)) return false;
      }
      if (search && !inv.document_number.toLowerCase().includes(search.toLowerCase())) return false;
      if (timeline !== "all" && !inRange(inv.created_at, range)) return false;
      return true;
    });
    list.sort((a, b) => {
      const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "desc" ? -t : t;
    });
    return list;
  }, [invoices, filterType, filterStatus, filterSource, search, timeline, range, sortDir]);

  const counts = {
    online: invoices.filter(i => i._order_channel === "online").length,
    pos: invoices.filter(i => i._order_channel === "in_store").length,
    manual: invoices.filter(i => !i._order_channel && !i.order_id).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Invoices & Documents</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={(v: any) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {docTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Client / Bill To</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Client name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                  <Input placeholder="Phone" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
                  <Input placeholder="Email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
                  <Input placeholder="Address" value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line Items</Label>
                  <div className="flex gap-2">
                    <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline"><Package className="h-3.5 w-3.5 mr-1" /> Add stock product</Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[320px]" align="end">
                        <Command>
                          <CommandInput placeholder="Search products..." />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((p) => (
                                <CommandItem key={p.id} value={`${p.name} ${p.sku ?? ""}`} onSelect={() => addProductLine(p)}>
                                  <div className="flex flex-col">
                                    <span>{p.name}</span>
                                    <span className="text-xs text-muted-foreground">{p.sku || "—"} · {formatRWF(p.price)}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" size="sm" variant="outline" onClick={addCustomLine}><Plus className="h-3.5 w-3.5 mr-1" /> Custom item</Button>
                  </div>
                </div>

                {lineItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-md">No items yet. Add a stock product or a custom item.</p>
                ) : (
                  <div className="space-y-2">
                    {lineItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start border rounded-md p-2">
                        <div className="col-span-6">
                          <Label className="text-[10px] uppercase text-muted-foreground">Name / Description</Label>
                          <Input value={it.description} onChange={(e) => updateLine(idx, { description: e.target.value })} placeholder="Item name" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] uppercase text-muted-foreground">Qty</Label>
                          <Input type="number" min={1} value={it.quantity} onChange={(e) => updateLine(idx, { quantity: Math.max(1, +e.target.value || 1) })} />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-[10px] uppercase text-muted-foreground">Unit Price (RWF)</Label>
                          <Input type="number" value={it.unit_price} onChange={(e) => updateLine(idx, { unit_price: +e.target.value || 0 })} />
                        </div>
                        <div className="col-span-1 flex justify-end pt-5">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="col-span-12 text-right text-xs text-muted-foreground">
                          Line total: <span className="font-medium text-foreground">{formatRWF(it.quantity * it.unit_price)}</span>
                          {it.product_id && <span className="ml-2 text-[10px] uppercase tracking-wide rounded px-1 bg-secondary text-secondary-foreground">Stock</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: +e.target.value || 0 })} /></div>
                <div><Label>Discount (RWF)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value || 0 })} /></div>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatRWF(subtotalFromItems)}</span></div>
                <div className="flex justify-between"><span>VAT ({form.tax_rate}%)</span><span>{formatRWF(formTaxAmount)}</span></div>
                {form.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatRWF(form.discount)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{formatRWF(formTotal)}</span></div>
              </div>

              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div>
                <Label>Payment Terms</Label>
                <Textarea
                  value={form.payment_terms}
                  onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                  placeholder="e.g. 50% deposit, balance on delivery. Bank transfer to BK 000123456789. Valid 14 days."
                  rows={2}
                />
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <Button onClick={handleCreate} className="w-full">Create Document</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterSource === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSource("all")}
        >
          All ({invoices.length})
        </Button>
        <Button
          variant={filterSource === "online" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSource("online")}
        >
          <Globe className="h-3.5 w-3.5 mr-1" /> Online Orders ({counts.online})
        </Button>
        <Button
          variant={filterSource === "pos" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSource("pos")}
        >
          <Store className="h-3.5 w-3.5 mr-1" /> POS Receipts ({counts.pos})
        </Button>
        <Button
          variant={filterSource === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterSource("manual")}
        >
          <FileText className="h-3.5 w-3.5 mr-1" /> Generated ({counts.manual})
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {docTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {docStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timeline} onValueChange={(v) => setTimeline(v as TimelinePreset)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIMELINE_ORDER.map((p) => (
              <SelectItem key={p} value={p}>{TIMELINE_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {timeline === "custom" && (
          <>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
          title={sortDir === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortDir === "desc" ? <ArrowDownAZ className="h-4 w-4 mr-1" /> : <ArrowUpAZ className="h-4 w-4 mr-1" />}
          {sortDir === "desc" ? "Newest" : "Oldest"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {invoices.length} · {TIMELINE_LABELS[timeline]}
      </p>


      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[320px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
            ) : filtered.map((inv) => {
              const isVirtual = inv._virtual;
              const sourceIcon = inv._order_channel === "online"
                ? <Globe className="h-3.5 w-3.5 text-primary" />
                : inv._order_channel === "in_store"
                ? <Store className="h-3.5 w-3.5 text-accent-foreground" />
                : <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
              const sourceLabel = inv._order_channel === "online"
                ? `Online #${inv._order_number ?? ""}`
                : inv._order_channel === "in_store"
                ? `POS #${inv._order_number ?? ""}`
                : inv.order_id ? "Linked" : "Manual";
              return (
              <TableRow key={inv.id} className={isVirtual ? "bg-muted/20" : undefined}>
                  <TableCell className="font-medium font-mono whitespace-nowrap">
                    {inv.document_number}
                    {isVirtual && <span className="ml-2 text-[9px] uppercase tracking-wide rounded px-1 py-0.5 bg-secondary text-secondary-foreground">Pending</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs">
                      {sourceIcon}
                      <span className="text-muted-foreground">{sourceLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize whitespace-nowrap">{inv.document_type}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={statusColors[inv.status] || "secondary"} className="capitalize">{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatRWF(inv.total)}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(inv.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-0.5 flex-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(inv)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(inv)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(inv)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(inv)} title="Share via WhatsApp"><Share2 className="h-4 w-4" /></Button>
                      {!isVirtual && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchAuditLog(inv.id)} title="Audit trail"><History className="h-4 w-4" /></Button>
                      )}
                      {isVirtual && inv._order_channel !== "online" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => generateFromOrder(inv)}
                          disabled={generatingId === inv.id}
                          title="Generate document from this order"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          {generatingId === inv.id ? "..." : "Generate"}
                        </Button>
                      )}
                      {inv.status === "draft" && (
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleMarkSent(inv)}>Send</Button>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleMarkPaid(inv)}>Mark Paid</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Document Preview — {viewing?.document_number}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <InvoicePreview
                invoiceId={viewing._virtual ? null : viewing.id}
                fallback={{
                  document_number: viewing.document_number,
                  document_type: viewing.document_type as string,
                  status: viewing.status as string,
                  subtotal: viewing.subtotal,
                  tax_rate: Number(viewing.tax_rate),
                  tax_amount: viewing.tax_amount,
                  discount: viewing.discount,
                  total: viewing.total,
                  notes: viewing.notes,
                  created_at: viewing.created_at,
                  paid_at: viewing.paid_at,
                  due_date: viewing.due_date,
                  order_id: viewing._order_id || viewing.order_id,
                  client_name: (viewing as any).client_name,
                  client_phone: (viewing as any).client_phone,
                  client_email: (viewing as any).client_email,
                  client_address: (viewing as any).client_address,
                }}
              />
              <div className="flex gap-2 flex-wrap justify-end pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => { handleEdit(viewing); setViewing(null); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => handleDownload(viewing)}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => handleShare(viewing)}><Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
                {viewing.status === "draft" && <Button size="sm" onClick={() => { handleMarkSent(viewing); setViewing(null); }}>Mark as Sent</Button>}
                {(viewing.status === "sent" || viewing.status === "overdue") && <Button size="sm" onClick={() => { handleMarkPaid(viewing); setViewing(null); }}>Mark as Paid</Button>}
                {viewing.status !== "cancelled" && viewing.status !== "paid" && (
                  <Button size="sm" variant="destructive" onClick={() => { handleCancel(viewing); setViewing(null); }}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Document — {editing?.document_number}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v: any) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {docStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border p-3 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Client / Bill To</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Client name" value={editForm.client_name} onChange={(e) => setEditForm({ ...editForm, client_name: e.target.value })} />
                  <Input placeholder="Phone" value={editForm.client_phone} onChange={(e) => setEditForm({ ...editForm, client_phone: e.target.value })} />
                  <Input placeholder="Email" value={editForm.client_email} onChange={(e) => setEditForm({ ...editForm, client_email: e.target.value })} />
                  <Input placeholder="Address" value={editForm.client_address} onChange={(e) => setEditForm({ ...editForm, client_address: e.target.value })} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line Items</Label>
                  <div className="flex gap-2">
                    <Popover open={editProductPickerOpen} onOpenChange={setEditProductPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" size="sm" variant="outline"><Package className="h-3.5 w-3.5 mr-1" /> Add stock product</Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[320px]" align="end">
                        <Command>
                          <CommandInput placeholder="Search products..." />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((p) => (
                                <CommandItem key={p.id} value={`${p.name} ${p.sku ?? ""}`} onSelect={() => addEditProductLine(p)}>
                                  <div className="flex flex-col">
                                    <span>{p.name}</span>
                                    <span className="text-xs text-muted-foreground">{p.sku || "—"} · {formatRWF(p.price)}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" size="sm" variant="outline" onClick={addEditCustomLine}><Plus className="h-3.5 w-3.5 mr-1" /> Custom item</Button>
                  </div>
                </div>

                {editLineItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 border rounded-md">No items yet. Add a stock product or a custom item.</p>
                ) : (
                  <div className="space-y-2">
                    {editLineItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start border rounded-md p-2">
                        <div className="col-span-6">
                          <Label className="text-[10px] uppercase text-muted-foreground">Name / Description</Label>
                          <Input value={it.description} onChange={(e) => updateEditLine(idx, { description: e.target.value })} placeholder="Item name" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] uppercase text-muted-foreground">Qty</Label>
                          <Input type="number" min={1} value={it.quantity} onChange={(e) => updateEditLine(idx, { quantity: Math.max(1, +e.target.value || 1) })} />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-[10px] uppercase text-muted-foreground">Unit Price (RWF)</Label>
                          <Input type="number" value={it.unit_price} onChange={(e) => updateEditLine(idx, { unit_price: +e.target.value || 0 })} />
                        </div>
                        <div className="col-span-1 flex justify-end pt-5">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeEditLine(idx)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="col-span-12 text-right text-xs text-muted-foreground">
                          Line total: <span className="font-medium text-foreground">{formatRWF(it.quantity * it.unit_price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tax Rate (%)</Label><Input type="number" value={editForm.tax_rate} onChange={(e) => setEditForm({ ...editForm, tax_rate: +e.target.value || 0 })} /></div>
                <div><Label>Discount (RWF)</Label><Input type="number" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: +e.target.value || 0 })} /></div>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatRWF(editSubtotal)}</span></div>
                <div className="flex justify-between"><span>VAT ({editForm.tax_rate}%)</span><span>{formatRWF(editTaxAmount)}</span></div>
                {editForm.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatRWF(editForm.discount)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{formatRWF(editTotal)}</span></div>
              </div>

              <div><Label>Due Date</Label><Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} /></div>


              <Separator />
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1">Save Changes</Button>
                <Button variant="outline" onClick={() => fetchAuditLog(editing.id)}><History className="h-4 w-4 mr-1" /> Audit Trail</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={showAudit} onOpenChange={setShowAudit}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader><DialogTitle>Audit Trail</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No changes recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((entry: any) => (
                  <div key={entry.id} className="p-3 rounded-md border text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">{entry.field_name.replace("_", " ")}</span>
                      <span className="text-muted-foreground">{format(new Date(entry.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground line-through">{entry.old_value || "—"}</span>
                      <span>→</span>
                      <span className="font-medium">{entry.new_value || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
