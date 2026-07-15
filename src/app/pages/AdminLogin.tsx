import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../config/supabaseClient";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Signing in only proves it's a valid Supabase account — still need to
      // confirm this specific account has is_admin before letting them through.
      const token = data.session?.access_token;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success || !json.profile?.is_admin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have admin access.");
      }

      toast.success("Welcome back");
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)" }}>Admin sign in</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>Restricted access — NUTX admin panel</div>
        </div>

        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Email</label>
        <input
          type="email" required autoFocus value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle} placeholder="you@nutx.com"
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", margin: "14px 0 4px" }}>Password</label>
        <input
          type="password" required value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle} placeholder="••••••••"
        />

        <button
          type="submit" disabled={loading}
          style={{
            width: "100%", marginTop: 20, padding: "10px 0", borderRadius: "var(--border-radius-md)",
            background: "var(--color-text-primary)", color: "var(--color-background-primary)",
            border: "none", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: "var(--border-radius-md)",
  border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)",
  color: "var(--color-text-primary)", fontSize: 14, outline: "none",
};