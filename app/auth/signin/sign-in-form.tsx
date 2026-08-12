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

    async function handleLogin(targetEmail: string, targetPass: string) {
        setLoading(true);
        setError(null);

        const res = await signIn("credentials", {
            email: targetEmail,
            password: targetPass,
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

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        await handleLogin(email, password);
    }

    return (
        <div className="mt-6 space-y-6">
            {/* טופס התחברות רגיל */}
            <form onSubmit={onSubmit} className="space-y-4">
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
                    className="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-60 hover:bg-slate-800"
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>

                {error && (
                    <p className="text-sm text-red-600 font-medium">
                        {error}
                    </p>
                )}
            </form>

            {/* אזור כפתורי כניסת דמו */}
            <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Demo Accounts
                </p>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleLogin("freelancer@clientvault.dev", "demo123")}
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        👨‍💻 Freelancer Demo
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleLogin("client@clientvault.dev", "demo123")}
                        className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        👤 Client Demo
                    </button>
                </div>
            </div>
        </div>
    );
}