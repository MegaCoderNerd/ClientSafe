"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@clientvault.dev");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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


  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
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

      <div className="mt-3 text-xs text-slate-600">
        Demo: demo@clientvault.dev / demo123
      </div>
    </form>
  );
}
