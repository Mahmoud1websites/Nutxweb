import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router";
import { useStore } from "../store";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  allowedRoles?: ("user" | "admin")[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  // Make sure your useStore exposes the user's role/profile (e.g., matching the backend profile schema)
  const { user, loading } = useStore(); 
  const navigate = useNavigate();

  // Determine user's role. Your backend checks if profile.is_admin is true.
  const userRole = user?.is_admin ? "admin" : "user";

  useEffect(() => {
    // 1. If loading is finished and no user exists, redirect to login
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }

    // 2. Role Authorization Check
    // If specific roles are required, check if the user's current role is authorized
    if (!loading && user && allowedRoles && !allowedRoles.includes(userRole)) {
      if (userRole === "user" && allowedRoles.includes("admin")) {
        // A standard user trying to access /api/admin paths -> send to unauthorized or home
        navigate("/unauthorized", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, loading, userRole, allowedRoles, navigate]);

  // Show loading indicator during token verification/profile fetching
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Verifying credentials...</p>
      </div>
    );
  }

  // Check if role is authorized before allowing the route to render via <Outlet />
  const isAuthorized = !allowedRoles || allowedRoles.includes(userRole);

  return user && isAuthorized ? <Outlet /> : null;
}