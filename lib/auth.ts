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

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (authError) {
          if (authError.message.includes("Email not confirmed")) {
            throw new Error("EmailNotConfirmed");
          }
          if (credentials.email === "demo@clientvault.dev" && credentials.password === "demo123") {
            return { id: "demo", email: "demo@clientvault.dev", name: "Demo User" };
          }
          return null;
        }

        const { data: publicUser } = await supabase
            .from("User")
            .select("*")
            .eq("email", credentials.email)
            .single();

        return {
          id: publicUser?.id || authData.user.id,
          email: authData.user.email!,
          name: publicUser?.name || "User"
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};