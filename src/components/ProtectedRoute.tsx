import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "staff" | "customer";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, hasRole, isStaff } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-serif text-2xl text-muted-foreground">DreamNest</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  if (requiredRole === "admin" && !hasRole("admin")) return <Navigate to="/" replace />;
  if (requiredRole === "staff" && !isStaff) return <Navigate to="/" replace />;

  return <>{children}</>;
}
