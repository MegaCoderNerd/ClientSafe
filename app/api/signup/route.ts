import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = body as { email?: string; name?: string; password?: string };
    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("User").select("id").eq("email", email).single();
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const { data: user, error } = await supabase
        .from("User")
        .insert({
          id: randomUUID(), // הוספת מזהה ייחודי למניעת שגיאת השרת
          email,
          name,
          password
        })
        .select("id, email, name")
        .single();

    if (error || !user) {
      console.error("/api/signup error", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    console.error("/api/signup error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}