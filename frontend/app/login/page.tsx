"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand (hidden on mobile) */}
      <div className="hidden md:flex flex-col justify-between flex-1 bg-slate-900 p-10 relative overflow-hidden">
        {/* Gradient glows */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[radial-gradient(circle,rgba(37,99,235,0.35)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[radial-gradient(circle,rgba(124,58,237,0.28)_0%,transparent_70%)] pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm">
            ⚡
          </div>
          <span className="font-display text-lg font-extrabold text-white tracking-tight">
            Agentic Workspace
          </span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Your knowledge,<br />amplified by AI.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Upload documents. Ask questions.<br />Take action — all in one workspace.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col items-center justify-center w-full md:max-w-sm lg:max-w-md px-8 py-12 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight mb-1">
            {isLogin ? "Sign in to your account" : "Create new account"}
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            {isLogin ? "Welcome back to your workspace" : "Join Agentic Workspace"}
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-150 bg-white"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-[3px] focus:ring-blue-500/15 focus:border-blue-500 transition-all duration-150 bg-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-[0_1px_2px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all duration-150"
            >
              {loading ? "Loading..." : isLogin ? "Sign in" : "Sign up"}
              {!loading && <span>→</span>}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

