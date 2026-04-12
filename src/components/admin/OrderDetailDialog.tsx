import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Mail, User, StickyNote, Package, MessageCircle } from "lucide-react";

interface OrderDetailDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({ orderId, open, onOpenChange }: OrderDetailDialogProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId || !open) return;
    setLoading(true);

    Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("order_items").select("*, product:products(name, images, sku)").eq("order_id", orderId),
    ]).then(([orderRes, itemsRes]) => {
      setOrder(orderRes.data);
      setItems(itemsRes.data || []);
      setLoading(false);
    });
  }, [orderId, open]);

  const formatRWF = (n: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  if (!open) return null;

  const customerName = order?.guest_name || "Registered Customer";
  const isGuest = !order?.customer_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Order #{order?.order_number}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : order ? (
          <div className="space-y-6">
            {/* Status Row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{order.status}</Badge>
              <Badge variant="outline" className="capitalize">{order.payment_status}</Badge>
              <Badge variant="secondary" className="capitalize">{order.channel}</Badge>
              {order.payment_method && (
                <Badge variant="secondary" className="capitalize">{order.payment_method.replace("_", " ")}</Badge>
              )}
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Customer</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{customerName}</span>
                  {isGuest && <Badge variant="outline" className="text-xs">Guest</Badge>}
                </div>
                {order.guest_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.guest_phone}</span>
                  </div>
                )}
                {order.guest_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.guest_email}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Shipping Info */}
            {(order.shipping_address || order.shipping_city) && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Shipping Address</h3>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {order.shipping_address && <p>{order.shipping_address}</p>}
                      {order.shipping_city && <p>{order.shipping_city}</p>}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Notes */}
            {order.notes && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Order Notes</h3>
                  <div className="flex items-start gap-2 text-sm">
                    <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm">{order.notes}</p>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Items */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Items</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.product?.name || "Unknown Product"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRWF(item.unit_price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium">{formatRWF(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRWF(order.subtotal)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatRWF(order.tax_amount)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatRWF(order.discount_amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium text-base">
                <span>Total</span>
                <span className="font-serif">{formatRWF(order.total)}</span>
              </div>
            </div>

            {/* Date */}
            <p className="text-xs text-muted-foreground">
              Created: {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
