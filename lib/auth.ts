import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
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

        try {
          const { data: user, error } = await supabase
              .from("User")
              .select("*")
              .eq("email", credentials.email)
              .single();

          if (error) {
            // Keep demo fallback
            if (credentials.email === "demo@clientvault.dev" && credentials.password === "demo123") {
              return { id: "demo", email: "demo@clientvault.dev", name: "Demo User" };
            }
            return null;
          }

          // Prefer the persisted demo user so seeded projects and shared vaults resolve correctly.
          if (
              user &&
              credentials.email === "demo@clientvault.dev" &&
              credentials.password === "demo123"
          ) {
            return { id: user.id, email: user.email, name: user.name };
          }

          if (!user) return null;
          if (user.password !== credentials.password) return null;
          return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
          console.error("[auth] error", error);

          if (credentials.email === "demo@clientvault.dev" && credentials.password === "demo123") {
            return { id: "demo", email: "demo@clientvault.dev", name: "Demo User" };
          }

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