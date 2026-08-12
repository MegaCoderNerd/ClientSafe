"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const errorDesc = searchParams.get("error_description");
        if (errorDesc) {
            setError(errorDesc.replace(/\+/g, " "));
        }
    }, [searchParams]);

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setMessage("Password updated successfully! Redirecting...");
            setTimeout(() => {
                router.push("/auth/signin");
            }, 2000);
        }
        setLoading(false);
    }

    return (
        <div className="flex flex-col items-center justify-center pt-24 px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-gray-100">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">Set New Password</h1>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                            type="password"
                            required
                            disabled={loading}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
                            placeholder="Enter your new password"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                    {message && <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{message}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-black text-white p-2.5 text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}