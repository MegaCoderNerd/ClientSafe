// app/api/signup/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, name, password } = body as { email?: string; name?: string; password?: string };

        if (!email || !name || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // שימוש بمערכת ה-Auth של Supabase שמטפלת באימות אימייל
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });

        if (error) {
            console.error("/api/signup auth error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: "Verification email sent! Please check your inbox before signing in."
        });
    } catch (error) {
        console.error("/api/signup error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}