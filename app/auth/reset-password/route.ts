import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.headers.get("origin") || "http://localhost:3000"}/auth/update-password`,
        });

        if (error) {
            console.error("Supabase Reset Password Error:", error.message); // <-- הוסף את זה
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Password reset email sent successfully!" });
    } catch (err: any) {
        console.error("Server Crash:", err);
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}