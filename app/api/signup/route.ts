import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = body as { email?: string; name?: string; password?: string };

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { data: existing, error: lookupError } = await supabase
      .from("User")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      console.error("/api/signup lookup error:", lookupError);
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
    }

    const { error } = await supabase.from("User").insert({
      id: randomUUID(),
      email: normalizedEmail,
      name: name.trim(),
      password,
    });

    if (error) {
      console.error("/api/signup insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Account created. You can sign in now.",
    });
  } catch (error) {
    console.error("/api/signup error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
