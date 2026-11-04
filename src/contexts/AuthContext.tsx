import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "staff" | "stock_manager" | "customer";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isStockManager: boolean;
  canManageStock: boolean;
  /** Branch the signed-in staff member is assigned to (null = all branches). */
  assignedLocationId: string | null;
  /** True when this user is locked to a single branch (non-admin with an assignment). */
  isBranchLocked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [assignedLocationId, setAssignedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (userId: string) => {
    const [{ data }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("assigned_location_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (data) setRoles(data.map((r: any) => r.role as AppRole));
    setAssignedLocationId((prof as any)?.assigned_location_id ?? null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRoles(session.user.id), 0);
        } else {
          setRoles([]);
          setAssignedLocationId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setAssignedLocationId(null);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isStockManager = hasRole("stock_manager");
  const isStaff = hasRole("staff") || isStockManager || isAdmin;
  const canManageStock = isAdmin || isStockManager;
  const isBranchLocked = !isAdmin && !!assignedLocationId;

  return (
    <AuthContext.Provider value={{ session, user, roles, loading, signOut, hasRole, isAdmin, isStaff, isStockManager, canManageStock, assignedLocationId, isBranchLocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
