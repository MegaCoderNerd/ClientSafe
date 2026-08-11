"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignInForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (res?.error) {
            setError("Invalid email or password. Please try again.");
        } else {
            router.push("/");
            router.refresh();
        }
    }

    return (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                {loading ? "Signing in..." : "Sign In"}
            </button>

            {error && (
                <p className="text-sm text-red-600 font-medium">
                    {error}
                </p>
            )}
        </form>
    );
}