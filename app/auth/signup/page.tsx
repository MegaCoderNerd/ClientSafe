"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      // Auto sign in after successful signup
      const signinResp = (await signIn("credentials", { email, password, redirect: false })) as
        | { error?: string; ok?: boolean; url?: string }
        | undefined;

      if (signinResp?.error) {
        // Redirect to sign-in page if auto sign-in failed
        router.push("/auth/signin");
        return;
      }

      router.push("/");
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Signup failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-4xl flex-col justify-center items-center p-8">
      <section className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
        <p className="text-sm text-slate-600 mb-4">Sign up to start creating and sharing secure delivery projects.</p>

        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              required
            />
          </label>

          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              required
            />
          </label>

          <label className="block text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>

      </section>
    </main>
  );
}
