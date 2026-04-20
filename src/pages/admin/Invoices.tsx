import { useEffect, useState } from "react";
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
import { Plus, Search, Eye, Pencil, History, Download, Share2, FileText, Store, Globe } from "lucide-react";
import { downloadInvoicePdf, shareInvoiceOnWhatsApp } from "@/lib/receiptUtils";
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<InvoiceRow | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    document_type: "invoice" as Invoice["document_type"],
    status: "draft" as Invoice["status"],
    subtotal: 0,
    tax_rate: 18,
    tax_amount: 0,
    discount: 0,
    total: 0,
    due_date: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    subtotal: 0,
    tax_rate: 18,
    tax_amount: 0,
    discount: 0,
    total: 0,
    due_date: "",
    notes: "",
    status: "draft" as Invoice["status"],
  });

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

    const realRows: InvoiceRow[] = (invoiceData || []).map((inv) => ({ ...inv } as InvoiceRow));

    // Merge & sort by created_at desc
    const merged = [...realRows, ...virtualRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setInvoices(merged);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const recalculate = (subtotal: number, taxRate: number, discount: number) => {
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return { tax_amount: taxAmount, total };
  };

  const updateForm = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    const calc = recalculate(next.subtotal, next.tax_rate, next.discount);
    setForm({ ...next, ...calc });
  };

  const updateEditForm = (patch: Partial<typeof editForm>) => {
    const next = { ...editForm, ...patch };
    const calc = recalculate(next.subtotal, next.tax_rate, next.discount);
    setEditForm({ ...next, ...calc });
  };

  const resetForm = () => {
    setForm({ document_type: "invoice", status: "draft", subtotal: 0, tax_rate: 18, tax_amount: 0, discount: 0, total: 0, due_date: "", notes: "" });
  };

  const handleCreate = async () => {
    const payload: TablesInsert<"invoices"> = {
      document_number: "TEMP",
      document_type: form.document_type,
      status: form.status,
      subtotal: form.subtotal,
      tax_rate: form.tax_rate,
      tax_amount: form.tax_amount,
      discount: form.discount,
      total: form.total,
      due_date: form.due_date || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("invoices").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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
      subtotal: inv.subtotal,
      tax_rate: Number(inv.tax_rate),
      tax_amount: inv.tax_amount,
      discount: inv.discount,
      total: inv.total,
      due_date: inv.due_date || "",
      notes: inv.notes || "",
      status: inv.status,
    });
    // Load invoice items
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("created_at");
    setInvoiceItems(data || []);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const changes: { field: string; old_val: string; new_val: string }[] = [];
    const fields: (keyof typeof editForm)[] = ["subtotal", "tax_rate", "discount", "total", "due_date", "notes", "status"];
    for (const f of fields) {
      const oldVal = String((editing as any)[f] ?? "");
      const newVal = String(editForm[f] ?? "");
      if (oldVal !== newVal) changes.push({ field: f, old_val: oldVal, new_val: newVal });
    }

    const update: any = {
      subtotal: editForm.subtotal,
      tax_rate: editForm.tax_rate,
      tax_amount: editForm.tax_amount,
      discount: editForm.discount,
      total: editForm.total,
      due_date: editForm.due_date || null,
      notes: editForm.notes || null,
      status: editForm.status,
    };
    if (editForm.status === "paid" && editing.status !== "paid") update.paid_at = new Date().toISOString();

    const { error } = await supabase.from("invoices").update(update).eq("id", editing.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // Write audit log
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

    toast({ title: "Invoice updated" });
    setEditing(null);
    fetchData();
  };

  const fetchAuditLog = async (invoiceId: string) => {
    const { data } = await supabase.from("invoice_audit_log" as any).select("*").eq("invoice_id", invoiceId).order("created_at", { ascending: false });
    setAuditLog(data || []);
    setShowAudit(true);
  };

  const filtered = invoices.filter((inv) => {
    if (filterType !== "all" && inv.document_type !== filterType) return false;
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (search && !inv.document_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Invoices & Documents</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={(v: any) => updateForm({ document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {docTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subtotal (RWF)</Label><Input type="number" value={form.subtotal} onChange={(e) => updateForm({ subtotal: +e.target.value })} /></div>
                <div><Label>Tax Rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => updateForm({ tax_rate: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Discount (RWF)</Label><Input type="number" value={form.discount} onChange={(e) => updateForm({ discount: +e.target.value })} /></div>
                <div><Label>Total</Label><Input value={formatRWF(form.total)} disabled /></div>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate} className="w-full">Create Document</Button>
            </div>
          </DialogContent>
        </Dialog>
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
            ) : filtered.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium font-mono">{inv.document_number}</TableCell>
                <TableCell className="capitalize">{inv.document_type}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[inv.status] || "secondary"} className="capitalize">{inv.status}</Badge>
                </TableCell>
                <TableCell>{formatRWF(inv.total)}</TableCell>
                <TableCell>{inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}</TableCell>
                <TableCell className="text-sm">{format(new Date(inv.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    <Button variant="ghost" size="icon" onClick={() => setViewing(inv)} title="View"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(inv)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => downloadInvoicePdf(inv.id)} title="Download PDF"><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => shareInvoiceOnWhatsApp(inv.id)} title="Share via WhatsApp"><Share2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => fetchAuditLog(inv.id)} title="Audit trail"><History className="h-4 w-4" /></Button>
                    {inv.status === "draft" && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(inv.id, "sent")}>Send</Button>
                    )}
                    {(inv.status === "sent" || inv.status === "overdue") && (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(inv.id, "paid")}>Mark Paid</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) setViewing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Document Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Number:</span> <span className="font-mono font-medium">{viewing.document_number}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{viewing.document_type}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColors[viewing.status] || "secondary"} className="capitalize">{viewing.status}</Badge></div>
                <div><span className="text-muted-foreground">Tax Rate:</span> {viewing.tax_rate}%</div>
                <div><span className="text-muted-foreground">Subtotal:</span> {formatRWF(viewing.subtotal)}</div>
                <div><span className="text-muted-foreground">Tax:</span> {formatRWF(viewing.tax_amount)}</div>
                <div><span className="text-muted-foreground">Discount:</span> {formatRWF(viewing.discount)}</div>
                <div><span className="text-muted-foreground font-semibold">Total:</span> <span className="font-semibold">{formatRWF(viewing.total)}</span></div>
              </div>
              {viewing.due_date && <p><span className="text-muted-foreground">Due:</span> {format(new Date(viewing.due_date), "MMM d, yyyy")}</p>}
              {viewing.paid_at && <p><span className="text-muted-foreground">Paid:</span> {format(new Date(viewing.paid_at), "MMM d, yyyy")}</p>}
              {viewing.notes && <p><span className="text-muted-foreground">Notes:</span> {viewing.notes}</p>}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => { openEdit(viewing); setViewing(null); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(viewing.id)}><Download className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => shareInvoiceOnWhatsApp(viewing.id)}><Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp</Button>
                {viewing.status === "draft" && <Button size="sm" onClick={() => { updateStatus(viewing.id, "sent"); setViewing(null); }}>Mark as Sent</Button>}
                {(viewing.status === "sent" || viewing.status === "overdue") && <Button size="sm" onClick={() => { updateStatus(viewing.id, "paid"); setViewing(null); }}>Mark as Paid</Button>}
                {viewing.status !== "cancelled" && viewing.status !== "paid" && (
                  <Button size="sm" variant="destructive" onClick={() => { updateStatus(viewing.id, "cancelled"); setViewing(null); }}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subtotal (RWF)</Label><Input type="number" value={editForm.subtotal} onChange={(e) => updateEditForm({ subtotal: +e.target.value })} /></div>
                <div><Label>Tax Rate (%)</Label><Input type="number" value={editForm.tax_rate} onChange={(e) => updateEditForm({ tax_rate: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Discount (RWF)</Label><Input type="number" value={editForm.discount} onChange={(e) => updateEditForm({ discount: +e.target.value })} /></div>
                <div><Label>Total</Label><Input value={formatRWF(editForm.total)} disabled /></div>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>

              {invoiceItems.length > 0 && (
                <div>
                  <Label className="mb-2 block">Line Items</Label>
                  <div className="rounded-md border text-xs">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-center">Qty</TableHead>
                          <TableHead className="text-xs text-right">Unit Price</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs">{item.description}</TableCell>
                            <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                            <TableCell className="text-xs text-right">{formatRWF(item.unit_price)}</TableCell>
                            <TableCell className="text-xs text-right">{formatRWF(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

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
