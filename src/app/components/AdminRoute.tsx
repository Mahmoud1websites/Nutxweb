import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { supabase } from "../config/supabaseClient";
import { toast } from "sonner";

export default function AdminRoute() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) { setIsAdmin(false); setLoading(false); }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const admin = !error && !!data?.is_admin;
        setIsAdmin(admin);
        setLoading(false);

        if (!admin) toast.error("You don't have access to the admin panel.");
      } catch {
        if (mounted) { setIsAdmin(false); setLoading(false); }
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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Checking access…
      </div>
    );
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}