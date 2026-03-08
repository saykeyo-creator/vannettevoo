import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) return null;
        if (!compareSync(password, user.passwordHash)) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
});
