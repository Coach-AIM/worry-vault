import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "coach" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Simple default fallback credentials
        if (credentials.username === "coach" && credentials.password === "password123") {
          return { id: "user_coach_1", name: "Coach", email: "coach@momentum.app" };
        }

        try {
          const userRows = await db.select().from(users).where(eq(users.username, credentials.username.trim().toLowerCase()));
          if (userRows.length > 0) {
            const user = userRows[0];
            const isValid = verifyPassword(credentials.password, user.passwordHash);
            if (isValid) {
              return { id: user.id, name: user.username, email: `${user.username}@momentum.app` };
            }
          }
        } catch (err) {
          console.error("Auth Query Error:", err);
        }

        return null;
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
