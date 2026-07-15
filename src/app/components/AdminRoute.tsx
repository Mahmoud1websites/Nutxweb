import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { supabase } from "../config/supabaseClient";
import { toast } from "sonner";

export default function AdminRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "no-session" | "not-admin" | "ok">("checking");

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setStatus("no-session");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const admin = !error && !!data?.is_admin;
        if (!admin) toast.error("You don't have access to the admin panel.");
        setStatus(admin ? "ok" : "not-admin");
      } catch {
        if (mounted) setStatus("no-session");
      }
    }

    checkAdmin();

    // Re-check if the person logs in/out or their session changes
    // while they're already sitting on an admin page.
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Checking access…
      </div>
    );
  }

  // No session at all → send to the sign-in form, remembering where they were headed.
  if (status === "no-session") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Logged in, but not an admin account → don't loop back to /login, just bounce home.
  if (status === "not-admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}