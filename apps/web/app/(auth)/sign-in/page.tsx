"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn.email({ email, password });

    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign in");
      return;
    }

    toast.success("Welcome back!");
    router.push("/workspace");
  };

  const handleGoogleSignIn = async () => {
    await signIn.social({ provider: "google" });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-[28px] border border-forge-border bg-forge-surface p-8 shadow-card sm:p-10">
        <h1 className="mb-2 text-[32px] font-bold tracking-tight text-forge-text">Sign In</h1>
        <p className="mb-8 text-[15px] text-forge-text-dim">Welcome back to ForgeAI.</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="mb-6 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-forge-border bg-forge-surface-2 font-medium text-forge-text shadow-card transition-colors hover:bg-forge-surface-2/80 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-forge-border" />
          </div>
          <span className="relative bg-forge-surface px-4 text-[13px] font-medium uppercase tracking-widest text-forge-text-dim dark:bg-zinc-900">
            OR
          </span>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="signin-email" className="text-[14px] font-medium text-forge-text-secondary">Email</label>
            <input
              id="signin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-forge-border bg-forge-surface px-4 text-forge-text shadow-card transition-all placeholder:text-forge-text-dim focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signin-password" className="text-[14px] font-medium text-forge-text-secondary">Password</label>
            <input
              id="signin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-forge-border bg-forge-surface px-4 text-forge-text shadow-card transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:bg-zinc-900"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 h-12 w-full cursor-pointer rounded-xl bg-brand-500 px-4 font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8 text-center text-[15px] text-forge-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-forge-text underline hover:text-forge-text-secondary">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
