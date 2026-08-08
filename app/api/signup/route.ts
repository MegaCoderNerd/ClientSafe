import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password } = body as { email?: string; name?: string; password?: string };
    if (!email || !name || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const user = await prisma.user.create({ data: { email, name, password } });
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    console.error("/api/signup error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
