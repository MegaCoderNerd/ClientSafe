import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const email = body?.email;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // שליחת מייל אימות החשבון המקורי מחדש
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: `${req.headers.get("origin") || "http://localhost:3000"}/auth/signin`,
            }
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Verification email resent successfully!" });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
    }
}