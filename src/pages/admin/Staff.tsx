import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Shield, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function Staff() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("staff");

  // Get all staff/admin users with their roles and profiles
  const { data: staffUsers, isLoading } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .in("role", ["admin", "staff"])
        .order("created_at", { ascending: true });

      if (!roles || roles.length === 0) return [];

      const userIds = [...new Set(roles.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      return userIds.map((uid) => {
        const userRoles = roles.filter((r) => r.user_id === uid);
        const profile = profileMap.get(uid);
        return {
          user_id: uid,
          full_name: profile?.full_name ?? "Unknown",
          phone: profile?.phone,
          roles: userRoles.map((r) => r.role),
          role_records: userRoles,
        };
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, oldRole, newRole }: { userId: string; oldRole: AppRole; newRole: AppRole }) => {
      // Remove old role
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", oldRole);
      // Add new role
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast.success("Role updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeStaff = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Remove the staff/admin role, keep customer role
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast.success("Staff access removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addStaff = useMutation({
    mutationFn: async () => {
      // Look up user by email via profiles — we need to find the user_id
      // Since we can't query auth.users, we search profiles by full_name matching the email
      // Actually, we need a different approach. Let's search all profiles and match.
      // The simplest approach: the admin enters the user_id or we look up via a known method.
      // For now, we'll invite by creating the role if the user exists.
      
      // We'll use a workaround: query profiles where full_name matches (since handle_new_user sets full_name to email)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", newEmail);

      if (!profiles || profiles.length === 0) {
        throw new Error("No user found with that email. They must sign up first.");
      }

      const userId = profiles[0].user_id;

      // Check if already has the role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", newRole);

      if (existing && existing.length > 0) {
        throw new Error("User already has this role");
      }

      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-users"] });
      toast.success("Staff member added");
      setAddOpen(false);
      setNewEmail("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive" as const;
    if (role === "staff") return "default" as const;
    return "secondary" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Staff Management</h1>
          <p className="text-muted-foreground">Manage staff members and their roles</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>User Email</Label>
                <Input
                  placeholder="staff@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">The user must have an account first.</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => addStaff.mutate()} disabled={!newEmail || addStaff.isPending}>
                {addStaff.isPending ? "Adding..." : "Add Staff Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{staffUsers?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{staffUsers?.filter((u) => u.roles.includes("admin")).length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{staffUsers?.filter((u) => u.roles.includes("staff") && !u.roles.includes("admin")).length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Staff Only</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : staffUsers && staffUsers.length > 0 ? (
                staffUsers.map((staff) => (
                  <TableRow key={staff.user_id}>
                    <TableCell className="font-medium">{staff.full_name}</TableCell>
                    <TableCell>{staff.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {staff.roles.map((role) => (
                          <Badge key={role} variant={roleBadgeVariant(role)}>{role}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {staff.roles.includes("staff") && !staff.roles.includes("admin") && (
                          <Button size="sm" variant="outline" onClick={() => updateRole.mutate({ userId: staff.user_id, oldRole: "staff", newRole: "admin" })}>
                            Promote to Admin
                          </Button>
                        )}
                        {staff.roles.includes("admin") && (
                          <Button size="sm" variant="outline" onClick={() => updateRole.mutate({ userId: staff.user_id, oldRole: "admin", newRole: "staff" })}>
                            Demote to Staff
                          </Button>
                        )}
                        {staff.roles.map((role) => (
                          role !== "customer" && (
                            <Button key={role} size="sm" variant="ghost" className="text-destructive" onClick={() => removeStaff.mutate({ userId: staff.user_id, role: role as AppRole })}>
                              Remove {role}
                            </Button>
                          )
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No staff members found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
