import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

type MockUser = {
  email: string;
  name: string;
  role: "FREELANCER" | "CLIENT";
  password: string;
};

const mockUsers: MockUser[] = [
  {
    email: "freelancer@clientvault.dev",
    name: "Demo Freelancer",
    role: "FREELANCER",
    password: "freelancer123",
  },
  {
    email: "client@clientvault.dev",
    name: "Demo Client",
    role: "CLIENT",
    password: "client123",
  },
];

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Mock Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const mockUser = mockUsers.find(
          (candidate) =>
            candidate.email === credentials?.email &&
            candidate.password === credentials?.password
        );

        if (!mockUser) {
          return null;
        }

        const dbUser = await prisma.user.upsert({
          where: { email: mockUser.email },
          update: {
            name: mockUser.name,
            role: mockUser.role,
          },
          create: {
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
          },
        });

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as "FREELANCER" | "CLIENT") ?? "CLIENT";
      }

      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
