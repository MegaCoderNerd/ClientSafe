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
    const [isEmailUnverified, setIsEmailUnverified] = useState(false);
    const [resendStatus, setResendStatus] = useState<string | null>(null);

    async function handleLogin(targetEmail: string, targetPass: string) {
        setLoading(true);
        setError(null);
        setIsEmailUnverified(false);
        setResendStatus(null);

        const res = await signIn("credentials", {
            email: targetEmail,
            password: targetPass,
            redirect: false,
        });

        setLoading(false);

        if (res?.error) {
            // בדיקה האם השגיאה קשורה לאימייל שלא אומת
            if (res.error.includes("EmailNotConfirmed") || res.error.includes("CredentialsSignin")) {
                // נבדוק מול Supabase דרך ה-API או ניחוש מושכל לפי סטטוס
                // לצורך הפשטות נציג את האפשרות אם ההתחברות נכשלה למשתמש רשום
                setError("Invalid email or password, or your email has not been verified yet.");
                setIsEmailUnverified(true);
            } else {
                setError("Invalid email or password. Please try again.");
            }
        } else {
            router.push("/");
            router.refresh();
        }
    }

    async function handleResendVerification() {
        if (!email) {
            setResendStatus("Please enter your email first.");
            return;
        }
        setResendStatus(null);
        try {
            const res = await fetch("/auth/resend/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) {
                setResendStatus("Verification email resent successfully! Check your inbox.");
            } else {
                setResendStatus(data.error || "Failed to resend verification email.");
            }
        } catch (err: any) {
            console.error(err);
            setResendStatus(err?.message || "An error occurred. Please try again.");
        }
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        await handleLogin(email, password);
    }

    return (
        <div className="mt-6 space-y-6">
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
                    <div className="space-y-2">
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                        {isEmailUnverified && (
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                className="text-xs text-blue-600 underline hover:text-blue-800 block font-medium"
                            >
                                Resend verification email
                            </button>
                        )}
                    </div>
                )}

                {resendStatus && (
                    <p className="text-sm text-green-600 font-medium">{resendStatus}</p>
                )}

                <div className="flex justify-between items-center text-xs mt-1">
                    <button
                        type="button"
                        onClick={async () => {
                            if (!email) {
                                setResendStatus("Please enter your email first to reset password.");
                                return;
                            }
                            try {
                                const res = await fetch("/auth/reset-password/", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ email }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                    setResendStatus("Password reset email sent! Check your inbox.");
                                } else {
                                    setResendStatus(data.error || "Failed to send reset email.");
                                }
                            } catch (err) {
                                setResendStatus("An error occurred.");
                            }
                        }}
                        className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
                    >
                        Forgot password?
                    </button>
                </div>
            </form>

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