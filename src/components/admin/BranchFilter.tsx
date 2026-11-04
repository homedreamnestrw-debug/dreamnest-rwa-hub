import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/hooks/useLocations";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

/**
 * Branch selector for list/report pages. Staff locked to a branch see a
 * read-only badge; admins/unassigned staff can pick "All branches" or one.
 */
export function BranchFilter({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const { isBranchLocked, assignedLocationId } = useAuth();
  const { data: locations = [] } = useLocations();

  if (isBranchLocked) {
    const name = locations.find((l) => l.id === assignedLocationId)?.name ?? "My branch";
    return (
      <Badge variant="outline" className="h-9 gap-1 px-3 font-normal">
        <MapPin className="h-3.5 w-3.5" /> {name}
      </Badge>
    );
  }
  if (locations.length < 2) return null;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-full sm:w-48"}>
        <MapPin className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All branches</SelectItem>
        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function useBranchName() {
  const { data: locations = [] } = useLocations();
  return (id?: string | null) => (id ? locations.find((l) => l.id === id)?.name ?? "—" : "—");
}
