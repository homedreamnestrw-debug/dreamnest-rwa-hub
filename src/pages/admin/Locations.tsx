import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Warehouse } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Location = Tables<"stock_locations">;

type LocationStats = {
  productCount: number;
  totalUnits: number;
};

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<Record<string, LocationStats>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: "", address: "", is_active: true });

  const fetchAll = useCallback(async () => {
    const [locRes, stockRes] = await Promise.all([
      supabase.from("stock_locations").select("*").order("created_at"),
      supabase.from("product_stock").select("location_id, quantity"),
    ]);
    setLocations(locRes.data || []);

    const map: Record<string, LocationStats> = {};
    (stockRes.data || []).forEach((r) => {
      if (!map[r.location_id]) map[r.location_id] = { productCount: 0, totalUnits: 0 };
      map[r.location_id].productCount += 1;
      map[r.location_id].totalUnits += r.quantity || 0;
    });
    setStats(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => {
    setForm({ name: "", address: "", is_active: true });
    setEditing(null);
  };

  const openEdit = (l: Location) => {
    setEditing(l);
    setForm({ name: l.name, address: l.address || "", is_active: l.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("stock_locations")
        .update({ name: form.name, address: form.address || null, is_active: form.is_active })
        .eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Location updated" });
    } else {
      const { error } = await supabase
        .from("stock_locations")
        .insert({ name: form.name, address: form.address || null, is_active: form.is_active });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Location created", description: "Stock rows seeded for all products." });
    }
    setDialogOpen(false);
    resetForm();
    fetchAll();
  };

  const toggleActive = async (l: Location) => {
    const { error } = await supabase
      .from("stock_locations")
      .update({ is_active: !l.is_active })
      .eq("id", l.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Locations</h1>
          <p className="text-sm text-muted-foreground">Manage warehouses and stores. Inventory is tracked per location.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Location" : "New Location"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Showroom" />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Optional" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Create"} Location</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Total Units</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : locations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No locations yet</TableCell></TableRow>
            ) : locations.map((l) => {
              const s = stats[l.id] || { productCount: 0, totalUnits: 0 };
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-muted-foreground" />
                      {l.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.address || "—"}</TableCell>
                  <TableCell>{s.productCount}</TableCell>
                  <TableCell>{s.totalUnits}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(l)} className="cursor-pointer">
                      <Badge variant={l.is_active ? "default" : "secondary"}>{l.is_active ? "Active" : "Inactive"}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
