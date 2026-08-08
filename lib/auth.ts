import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

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

        // Quick local fallback for demo user to avoid blocking development when DB/migrations are not ready.
        if (
          credentials.email === "demo@clientvault.dev" &&
          credentials.password === "demo123"
        ) {
          return { id: "demo", email: "demo@clientvault.dev", name: "Demo User" };
        }

        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email } });
          if (!user) return null;
          if (user.password !== credentials.password) return null;
          return { id: user.id, email: user.email, name: user.name };
        } catch (error) {
          console.error("[auth] error", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      return session;
    },
  },
  pages: { signIn: "/auth/signin" },
};
