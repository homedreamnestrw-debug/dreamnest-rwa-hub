import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Gift, CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

export default function AdminGiftVouchers() {
  const queryClient = useQueryClient();
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["admin-gift-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["admin-voucher-redemptions", selectedVoucher?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voucher_redemptions")
        .select("*, orders(order_number)")
        .eq("voucher_id", selectedVoucher!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVoucher,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gift_vouchers")
        .update({
          payment_approved: true,
          payment_status: "paid",
          status: "active",
          payment_approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // Send emails to recipient, buyer, and shop with PDF
      const voucher = vouchers.find((v) => v.id === id);
      if (voucher) {
        await supabase.functions.invoke("send-voucher-emails", {
          body: { voucher_code: voucher.code, type: "approved" },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-vouchers"] });
      toast.success("Voucher approved and activated — emails sent");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gift_vouchers")
        .update({ status: "cancelled", payment_status: "refunded" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gift-vouchers"] });
      toast.success("Voucher rejected");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "secondary";
      case "redeemed": return "outline";
      case "expired": case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const pendingCount = vouchers.filter((v) => v.status === "pending").length;
  const activeCount = vouchers.filter((v) => v.status === "active").length;
  const totalValue = vouchers.filter((v) => v.status === "active").reduce((s, v) => s + v.balance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Gift Vouchers</h1>
        <p className="text-muted-foreground">Manage gift voucher purchases and approvals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Gift className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending Approval</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active Vouchers</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatPrice(totalValue)}</div>
              <div className="text-xs text-muted-foreground">Outstanding Balance</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-bold">{v.code}</TableCell>
                    <TableCell>{formatPrice(v.amount)}</TableCell>
                    <TableCell>{formatPrice(v.balance)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{v.buyer_name}</div>
                      <div className="text-xs text-muted-foreground">{v.buyer_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{v.recipient_name}</div>
                      <div className="text-xs text-muted-foreground">{v.recipient_email || v.recipient_phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(v.status) as any}>{v.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(v.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedVoucher(v)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {v.status === "pending" && (
                          <>
                            <Button size="sm" variant="default" onClick={() => approveMutation.mutate(v.id)} disabled={approveMutation.isPending}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => rejectMutation.mutate(v.id)} disabled={rejectMutation.isPending}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vouchers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No vouchers yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedVoucher} onOpenChange={() => setSelectedVoucher(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Voucher Details</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <div className="font-mono text-2xl font-bold tracking-widest">{selectedVoucher.code}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatPrice(selectedVoucher.amount)} — Balance: {formatPrice(selectedVoucher.balance)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusColor(selectedVoucher.status) as any}>{selectedVoucher.status}</Badge></div>
                <div><span className="text-muted-foreground">Payment:</span> {selectedVoucher.payment_method?.replace("_", " ")}</div>
                <div><span className="text-muted-foreground">Buyer:</span> {selectedVoucher.buyer_name}</div>
                <div><span className="text-muted-foreground">Recipient:</span> {selectedVoucher.recipient_name}</div>
                <div><span className="text-muted-foreground">Created:</span> {format(new Date(selectedVoucher.created_at), "MMM d, yyyy")}</div>
                <div><span className="text-muted-foreground">Expires:</span> {format(new Date(selectedVoucher.expires_at), "MMM d, yyyy")}</div>
              </div>
              {selectedVoucher.personal_message && (
                <div className="p-3 bg-primary/5 rounded-lg text-sm italic">"{selectedVoucher.personal_message}"</div>
              )}
              {redemptions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Redemption History</h4>
                  {redemptions.map((r: any) => (
                    <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span>Order #{r.orders?.order_number}</span>
                      <span>{formatPrice(r.amount_used)}</span>
                      <span className="text-muted-foreground">{format(new Date(r.created_at), "MMM d")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
