import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureDemoWorkspace } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

const DEMO_ACCOUNTS: Record<string, { id: string; name: string; password: string }> = {
  "freelancer@clientvault.dev": {
    id: "freelancer-demo",
    name: "Freelancer Demo",
    password: "demo123",
  },
  "client@clientvault.dev": {
    id: "client-demo",
    name: "Client Demo",
    password: "demo123",
  },
  "demo@clientvault.dev": {
    id: "demo",
    name: "Demo User",
    password: "demo123",
  },
};

function getDemoAccount(email: string, password: string) {
  const demo = DEMO_ACCOUNTS[email.toLowerCase()];
  if (!demo || demo.password !== password) return null;
  return demo;
}

function toAuthUser(user: { id: string; email: string; name: string }) {
  return { id: user.id, email: user.email, name: user.name };
}

async function ensureDemoUser(email: string, demo: { id: string; name: string; password: string }) {
  const { data: existing, error: lookupError } = await supabase
    .from("User")
    .select("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (existing) return toAuthUser(existing);

  if (lookupError) {
    console.error("[auth] demo user lookup failed", lookupError);
  }

  const { data: created, error: insertError } = await supabase
    .from("User")
    .upsert(
      {
        id: demo.id,
        email,
        name: demo.name,
        password: demo.password,
      },
      { onConflict: "email" },
    )
    .select("id, email, name")
    .maybeSingle();

  if (created) return toAuthUser(created);

  if (insertError) {
    console.error("[auth] demo user upsert failed", insertError);
  }

  return { id: demo.id, email, name: demo.name };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;
        const demo = getDemoAccount(email, password);

        try {
          if (demo) {
            const user = await ensureDemoUser(email, demo);
            await ensureDemoWorkspace();
            return user;
          }

          const { data: user, error } = await supabase
            .from("User")
            .select("id, email, name, password")
            .eq("email", email)
            .maybeSingle();

          if (error) {
            console.error("[auth] user lookup failed", error);
            return null;
          }

          if (!user || user.password !== password) return null;
          return toAuthUser(user);
        } catch (error) {
          console.error("[auth] error", error);
          if (demo) return { id: demo.id, email, name: demo.name };
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};
