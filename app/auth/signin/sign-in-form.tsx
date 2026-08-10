"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = (await signIn("credentials", {
      email,
      password,
      redirect: false,
    })) as { error?: string; ok?: boolean; url?: string } | undefined;

    setLoading(false);

    if (response?.error) {
      setError(response.error ?? "Invalid credentials");
      return;
    }

    const destination = response?.url ?? "/";
    router.push(destination);
  }

  async function quickLogin(quickEmail: string, quickPassword: string) {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setError(null);
    setLoading(true);

    const response = (await signIn("credentials", {
      email: quickEmail,
      password: quickPassword,
      redirect: false,
    })) as { error?: string; ok?: boolean; url?: string } | undefined;

    setLoading(false);

    if (response?.error) {
      setError(response.error ?? "Invalid credentials");
      return;
    }

    const destination = response?.url ?? "/";
    router.push(destination);
  }

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border p-2"
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border p-2"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="mt-6 border-t pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Demo Accounts</p>
        <div className="space-y-2">
          <button
            onClick={() => quickLogin("freelancer@clientvault.dev", "demo123")}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            👨‍💼 Freelancer Demo
          </button>
          <button
            onClick={() => quickLogin("client@clientvault.dev", "demo123")}
            disabled={loading}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-60"
          >
            👤 Client Demo
          </button>
        </div>
      </div>
    </>
  );
}
