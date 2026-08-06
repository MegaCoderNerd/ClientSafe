"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function SignInForm() {
  const [email, setEmail] = useState("freelancer@clientvault.dev");
  const [password, setPassword] = useState("freelancer123");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    const nextEmail = String(formData.get("email") ?? "");
    const nextPassword = String(formData.get("password") ?? "");
    const response = await signIn("credentials", {
      email: nextEmail,
      password: nextPassword,
      redirect: false,
    });

    if (response?.error) {
      setError("Invalid credentials");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <form action={onSubmit} className="mt-4 space-y-4">
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
      <button type="submit" className="w-full rounded-md bg-slate-900 px-4 py-2 text-white">
        Sign In
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="space-y-1 text-xs text-slate-600">
        <p>FREELANCER: freelancer@clientvault.dev / freelancer123</p>
        <p>CLIENT: client@clientvault.dev / client123</p>
      </div>
    </form>
  );
}
