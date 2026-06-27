import { useState } from "react";
import { useNavigate } from "react-router";
import { useStore } from "../store";
import { LogIn, UserPlus, Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail } = useStore();
  const navigate = useNavigate();

  // Local storage for user roles returned upon authentication


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // 1. Change the state definition to accept 'any' so it doesn't break on unexpected backend types
  // Force the state container to skip property validation errors
  const [userProfile, setUserProfile] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        // 1. Capture the raw API return object
        const result = await signInWithEmail(formData.email.trim(), formData.password);

        // 2. Cast the payload as an unrestricted type to safely extract parameters
        const authData = result as any;

        // 3. Normalize the properties safely, verifying nested properties
        const formattedProfile = {
          id: authData?.id || authData?.user?.id,
          email: authData?.email || authData?.user?.email,
          is_admin: !!(authData?.is_admin || authData?.profile?.is_admin || authData?.user?.is_admin)
        };

        setUserProfile(formattedProfile);
        toast.success("Welcome back!");

        // 4. Clean evaluation using the safely flattened parameters
        if (formattedProfile.is_admin) {
          navigate("/admin");
        } else {
          navigate("/account");
        }
      } else {
        // Sign-up block sequence...
        if (!formData.name.trim()) {
          toast.error("Please enter your name");
          setLoading(false);
          return;
        }
        await signUpWithEmail(formData.email.trim(), formData.password, formData.name.trim());
        toast.success("Account created successfully!");
        navigate("/account");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setFormData({ name: "", email: formData.email, password: "" });
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">

        {/* Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-muted rounded-xl mb-6">
          <button
            type="button"
            onClick={() => toggleAuthMode(true)}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors ${isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => toggleAuthMode(false)}
            className={`py-2 text-sm font-semibold rounded-lg transition-colors ${!isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Register
          </button>
        </div>

        {/* Header Heading */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-foreground">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Access your custom profile and orders" : "Sign up for a faster checkout experience"}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Register
              </>
            )}
          </button>

          {/* Checked parameters safely wrapped inside clean JSX tags */}
          {(userProfile?.role === "admin" || userProfile?.is_admin) && (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold text-center mt-2">
              Administrator mode active.
            </div>
          )}
        </form>

      </div>
    </div>
  );
}