"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { registerUserAction } from "@/actions/authActions";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Building,
  ArrowRight,
} from "lucide-react";

export default function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phno, setPhno] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage(null);
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setErrorMessage("Failed to initiate Google sign in. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }
      const trimmedPhno = phno.trim();
      if (!trimmedPhno || trimmedPhno.length !== 10 || !/^\d{10}$/.test(trimmedPhno)) {
        setErrorMessage("Phone number must be exactly 10 digits.");
        return;
      }

      setLoading(true);
      try {
        const res = await registerUserAction({
          name: name.trim(),
          email: trimmedEmail,
          password,
          phno: trimmedPhno,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Failed to create account.");
          setLoading(false);
          return;
        }

        setSuccessMessage("Account created successfully! Signing you in...");

        const loginRes = await signIn("credentials", {
          redirect: false,
          email: trimmedEmail,
          password,
        });

        if (loginRes?.error) {
          setErrorMessage(
            "Account created, but automatic sign in failed. Please sign in manually."
          );
          setMode("signin");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setErrorMessage(msg);
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await signIn("credentials", {
          redirect: false,
          email: trimmedEmail,
          password,
        });

        if (res?.error) {
          setErrorMessage("Invalid email or password. Please try again.");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "An error occurred during sign in.";
        setErrorMessage(msg);
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 text-white shadow-xs mb-3">
            <Building className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {mode === "signin" ? "Sign in to CRAS" : "Create institutional account"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "signin"
              ? "Access campus resource bookings and approvals"
              : "Register to request facilities across campus"}
          </p>
        </div>

        {/* Tab switch between Sign In and Register */}
        <div className="flex rounded-lg bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number (10 Digits)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  required
                  minLength={10}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={phno}
                  onChange={(e) => setPhno(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>
                {mode === "signin" ? "Signing In..." : "Creating Account..."}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                {mode === "signin" ? "Sign In with Credentials" : "Create Account"}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
              Or OAuth
            </span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}
