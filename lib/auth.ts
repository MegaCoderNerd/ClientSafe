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

        // 1. שליפת המידע הרשמי מתוך טבלת User הציבורית
        const { data: dbUser, error: dbError } = await supabase
            .from("User")
            .select("*")
            .eq("email", credentials.email)
            .single();

        if (dbError || !dbUser) return null;

        // 2. אימות הסיסמה מול מנגנון האבטחה של Supabase
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (authError) {
          if (authError.message.includes("Email not confirmed")) {
            throw new Error("EmailNotConfirmed");
          }
          return null;
        }

        // 3. ניקוי הסשן של Supabase בשרת כדי למנוע התנגשויות לאחר Logout
        await supabase.auth.signOut();

        // 4. החזרת המידע המדויק לתוך NextAuth
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};