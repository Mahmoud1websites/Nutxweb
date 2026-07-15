import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { supabase } from "../config/supabaseClient";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (!cancelled) setStatus("denied"); return; }

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!cancelled) setStatus(json.success && json.profile?.is_admin ? "ok" : "denied");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    }

    check();

    // Re-check if they sign out in another tab, token expires, etc.
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  if (status === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
        Checking access…
      </div>
    );
  }

  if (status === "denied") return <Navigate to="/admin-login" replace />;

  return <>{children}</>;
}