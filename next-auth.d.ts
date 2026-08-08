import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }

  interface User {}
}

declare module "next-auth/jwt" {
  interface JWT {}
}
