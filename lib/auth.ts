import { timingSafeEqual } from "crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ensureDemoWorkspace } from "@/lib/demo-data";
import { ensureAppUserFromAuth } from "@/lib/ensure-app-user";
import { findAuthUserByEmail } from "@/lib/supabase-auth-admin";
import { getSupabaseAnon } from "@/lib/supabase-anon";
import { supabase } from "@/lib/supabase";

const DEMO_ACCOUNTS: Record<string, { id: string; name: string; password: string }> = {
  "freelancer@clientsafe.dev": {
    id: "freelancer-demo",
    name: "Freelancer Demo",
    password: "demo123",
  },
  "client@clientsafe.dev": {
    id: "client-demo",
    name: "Client Demo",
    password: "demo123",
  },
  "demo@clientsafe.dev": {
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

function passwordsMatch(stored: string, provided: string) {
  const storedBuffer = Buffer.from(stored);
  const providedBuffer = Buffer.from(provided);
  if (storedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(storedBuffer, providedBuffer);
}

async function migrateLegacyPasswordUser(email: string, password: string) {
  const { data: appUser } = await supabase
    .from("User")
    .select("id, email, name, password")
    .eq("email", email)
    .maybeSingle();

  if (!appUser?.password || !passwordsMatch(appUser.password, password)) {
    return null;
  }

  const existingAuth = await findAuthUserByEmail(email);
  if (existingAuth) return null;

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: appUser.name },
  });

  if (createError || !created.user) {
    if (createError && !createError.message.toLowerCase().includes("already")) {
      console.error("[auth] legacy user migrate failed", createError);
    }
    return null;
  }

  await supabase
    .from("User")
    .update({ externalId: created.user.id, password: null })
    .eq("id", appUser.id);

  return toAuthUser(appUser);
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

          const { data: authData, error: authError } = await getSupabaseAnon().auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            const message = authError.message.toLowerCase();
            if (message.includes("not confirmed") || message.includes("email not confirmed")) {
              throw new Error("EMAIL_NOT_CONFIRMED");
            }

            const migrated = await migrateLegacyPasswordUser(email, password);
            if (migrated) return migrated;
            return null;
          }

          const confirmed = Boolean(authData.user?.email_confirmed_at || authData.user?.confirmed_at);
          if (!authData.user || !confirmed) {
            throw new Error("EMAIL_NOT_CONFIRMED");
          }

          const appUser = await ensureAppUserFromAuth(authData.user);
          if (!appUser) return null;
          return toAuthUser(appUser);
        } catch (error) {
          if (error instanceof Error && error.message === "EMAIL_NOT_CONFIRMED") {
            throw error;
          }
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
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const userId = token.id ?? token.sub;
        if (userId) session.user.id = userId;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};
