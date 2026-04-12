import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, Mail, MailOpen } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function Messages() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["contact_submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Submission[];
    },
  });

  const toggleRead = useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ is_read })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact_submissions"] }),
    onError: () => toast.error("Failed to update status"),
  });

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.subject?.toLowerCase().includes(q) ?? false) ||
      m.message.toLowerCase().includes(q)
    );
  });

  const openMessage = (msg: Submission) => {
    setSelected(msg);
    if (!msg.is_read) {
      toggleRead.mutate({ id: msg.id, is_read: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-semibold">Messages</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No messages found.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => openMessage(m)}
                >
                  <TableCell>
                    {m.is_read ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </TableCell>
                  <TableCell className={m.is_read ? "" : "font-semibold"}>
                    {m.name}
                  </TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.subject || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(m.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRead.mutate({ id: m.id, is_read: !m.is_read });
                      }}
                    >
                      {m.is_read ? "Mark unread" : "Mark read"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {selected.subject || "No Subject"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <span className="text-muted-foreground">From:</span>
                <span>{selected.name} &lt;{selected.email}&gt;</span>
              </div>
              {selected.phone && (
                <div className="flex gap-4">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{selected.phone}</span>
                </div>
              )}
              <div className="flex gap-4">
                <span className="text-muted-foreground">Date:</span>
                <span>{format(new Date(selected.created_at), "PPpp")}</span>
              </div>
              <hr />
              <p className="whitespace-pre-wrap leading-relaxed">{selected.message}</p>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
