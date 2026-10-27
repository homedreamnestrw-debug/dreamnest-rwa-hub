import { supabase } from "@/integrations/supabase/client";

/** Map of auth user id -> display name, used to show who created orders/invoices. */
export async function loadStaffNames(): Promise<Record<string, string>> {
  const { data } = await supabase.from("profiles").select("user_id, full_name");
  const map: Record<string, string> = {};
  (data || []).forEach((p: any) => {
    if (p?.user_id) map[p.user_id] = (p.full_name || "").trim() || "Staff";
  });
  return map;
}
