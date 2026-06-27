import { ArrowRight, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { supabase } from "../config/supabaseClient";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr("");
    if (!email.includes("@")) { setEmailErr("Enter a valid email address."); return; }
    if (password.length < 6) { setEmailErr("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setEmailErr(error.message); return; }
      navigate(from, { replace: true });
    } catch {
      setEmailErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative">

      <button
        type="button"
        onClick={() => navigate("/")}
        className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors border border-border bg-background"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* LEFT — Brand panel */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-card border-r border-border">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=900&h=1200&fit=crop&auto=format&q=85"
            alt="Garage Hub"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        </div>

        <div className="relative flex flex-col justify-between h-full p-10">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">GH</span>
            </div>
            <span className="font-black text-lg text-foreground">Garage Hub</span>
          </Link>

          <div className="flex flex-col gap-4">
            <div className="h-px w-10 bg-primary" />
            <h2 className="text-4xl font-black text-foreground leading-tight">
              Your car deserves
              <br />
              <span className="text-primary">the best parts.</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              Sign in to track your orders, save your wishlist, and get exclusive access to
              member-only deals from Lebanon's #1 car accessories store.
            </p>

            <div className="flex flex-col gap-2 mt-2">
              {[
                "Free delivery on orders over $150",
                "Exclusive member deals and early access",
                "Order tracking and full purchase history",
              ].map((perk) => (
                <div key={perk} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <p className="text-sm text-muted-foreground">{perk}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Garage Hub. All rights reserved.
          </p>
        </div>
      </div>

      {/* RIGHT — Auth form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">GH</span>
            </div>
            <span className="font-black text-base text-foreground">Garage Hub</span>
          </Link>

          <h1 className="text-2xl font-black text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-7">Sign in to your account to continue.</p>

          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin + from },
              });
              if (error) setEmailErr(error.message);
            }}
            className="w-full flex items-center justify-center gap-2.5 border border-border bg-card hover:bg-muted text-foreground font-semibold py-2.5 rounded-xl text-sm transition-colors mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {emailErr && <p className="text-xs font-medium text-destructive">{emailErr}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-all hover:gap-3 text-sm mt-1 disabled:opacity-60"
            >
              {loading ? "Signing in…" : <> Sign In <ArrowRight className="w-4 h-4" /> </>}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-7">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-bold hover:underline">
              Create one — it's free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}