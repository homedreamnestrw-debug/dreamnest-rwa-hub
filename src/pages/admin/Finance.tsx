import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle2, XCircle, Eye, Clock, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog";
import { autoCreateReceiptForOrder } from "@/lib/receiptUtils";

export default function Finance() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [rejectNote, setRejectNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("payment_approved", false)
      .eq("channel", "online")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const formatRWF = (n: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  const sendNotification = async (order: any, type: "approved" | "rejected", note?: string) => {
    const email = order.guest_email;
    if (!email) return;
    const name = order.guest_name || "Customer";
    const orderNum = order.order_number;
    const subject = type === "approved"
      ? `Payment Confirmed – Order #${orderNum}`
      : `Payment Update – Order #${orderNum}`;
    const html = type === "approved"
      ? `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
           <h2 style="color:#5c4033">Payment Confirmed ✓</h2>
           <p>Dear ${name},</p>
           <p>Your payment for <strong>Order #${orderNum}</strong> has been verified and approved. Your order is now being processed.</p>
           <p>Thank you for shopping with DreamNest!</p>
           <p style="color:#999;font-size:12px;margin-top:32px">DreamNest – Premium Bedding & Home Decor</p>
         </div>`
      : `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
           <h2 style="color:#5c4033">Payment Could Not Be Verified</h2>
           <p>Dear ${name},</p>
           <p>Unfortunately, we were unable to verify the payment for <strong>Order #${orderNum}</strong> and the order has been cancelled.</p>
           ${note ? `<p><strong>Reason:</strong> ${note}</p>` : ""}
           <p>Please feel free to place a new order or contact us for assistance.</p>
           <p style="color:#999;font-size:12px;margin-top:32px">DreamNest – Premium Bedding & Home Decor</p>
         </div>`;
    try {
      await supabase.functions.invoke("notify-customer", {
        body: { to: email, subject, html },
      });
    } catch (e) {
      console.error("Notification failed:", e);
    }
  };

  const approvePayment = async (orderId: string) => {
    setProcessing(orderId);
    const order = orders.find((o) => o.id === orderId);
    const { error } = await supabase.rpc("approve_order_payment", { order_id: orderId });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Auto-generate receipt document
      try { await autoCreateReceiptForOrder(orderId); } catch (e) { console.error("Receipt auto-create failed", e); }
      toast({ title: "Payment approved", description: "Order moved to processing, stock deducted, and receipt created." });
      if (order) sendNotification(order, "approved");
    }
    setProcessing(null);
    fetchOrders();
  };

  const rejectPayment = async () => {
    if (!rejectDialog.orderId) return;
    setProcessing(rejectDialog.orderId);
    const order = orders.find((o) => o.id === rejectDialog.orderId);
    const { error } = await supabase.rpc("reject_order_payment", {
      order_id: rejectDialog.orderId,
      rejection_note: rejectNote || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment rejected", description: "Order has been cancelled." });
      if (order) sendNotification(order, "rejected", rejectNote);
    }
    setProcessing(null);
    setRejectDialog({ open: false, orderId: null });
    setRejectNote("");
    fetchOrders();
  };

  const filtered = orders.filter((o) => {
    const s = search.toLowerCase();
    return (
      o.order_number?.toString().includes(search) ||
      (o.guest_name || "").toLowerCase().includes(s) ||
      (o.guest_phone || "").includes(search) ||
      (o.guest_email || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Payment Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve online order payments before they enter processing
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {orders.length} pending
        </Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order #, name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No pending payment approvals
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">#{o.order_number}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span>{o.guest_name || "Registered"}</span>
                      {o.guest_phone && <p className="text-xs text-muted-foreground">{o.guest_phone}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {(o.payment_method || "—").replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatRWF(o.total)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <Clock className="h-3 w-3" />
                      Awaiting Approval
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailOrderId(o.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                        disabled={processing === o.id}
                        onClick={() => approvePayment(o.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        disabled={processing === o.id}
                        onClick={() => setRejectDialog({ open: true, orderId: o.id })}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, orderId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will cancel the order. The customer will need to place a new order.
            </p>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Payment not received, invalid payment reference..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, orderId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={rejectPayment} disabled={!!processing}>
              Reject & Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrderDetailDialog
        orderId={detailOrderId}
        open={!!detailOrderId}
        onOpenChange={(open) => !open && setDetailOrderId(null)}
      />
    </div>
  );
}
