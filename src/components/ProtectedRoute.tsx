import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "staff" | "stock_manager" | "stock_or_admin" | "customer";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, hasRole, isStaff, isAdmin, canManageStock } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-serif text-2xl text-muted-foreground">DreamNest</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  if (requiredRole === "admin" && !isAdmin) return <Navigate to="/" replace />;
  if (requiredRole === "staff" && !isStaff) return <Navigate to="/" replace />;
  if (requiredRole === "stock_manager" && !hasRole("stock_manager")) return <Navigate to="/" replace />;
  if (requiredRole === "stock_or_admin" && !canManageStock) return <Navigate to="/" replace />;

  return <>{children}</>;
}
