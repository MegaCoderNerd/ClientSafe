import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "FREELANCER" | "CLIENT";
    };
  }

  interface User {
    role: "FREELANCER" | "CLIENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "FREELANCER" | "CLIENT";
  }
}
