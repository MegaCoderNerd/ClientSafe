import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Verify user has access to this project
  const { data: project, error: projectError } = await supabase
      .from("DeliveryProject")
      .select("*")
      .eq("id", projectId)
      .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (session.user.id !== project.freelancerId && session.user.id !== project.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch messages with explicit foreign key to the sender
  const { data: messages, error: messagesError } = await supabase
      .from("ChatMessage")
      .select(`
      *,
      sender:User!senderId (
        id,
        name,
        email
      )
    `)
      .eq("projectId", projectId)
      .order("createdAt", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  return NextResponse.json(messages || []);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, content } = body;

  if (!projectId || !content) {
    return NextResponse.json({ error: "projectId and content are required" }, { status: 400 });
  }

  // Verify user has access to this project
  const { data: project, error: projectError } = await supabase
      .from("DeliveryProject")
      .select("*")
      .eq("id", projectId)
      .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (session.user.id !== project.freelancerId && session.user.id !== project.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Insert the new message with an explicitly generated UUID
  const { data: message, error: insertError } = await supabase
      .from("ChatMessage")
      .insert({
        id: randomUUID(),
        projectId,
        senderId: session.user.id,
        content: content.trim(),
      })
      .select(`
      *,
      sender:User!senderId (
        id,
        name,
        email
      )
    `)
      .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }

  return NextResponse.json(message, { status: 201 });
}