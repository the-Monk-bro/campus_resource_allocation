import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import pool from "@/lib/db";
import { MySqlAdapter } from "@/lib/mysqlAdapter";
import { UserRow } from "@/lib/types/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: MySqlAdapter(pool),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    newUser: "/onboarding",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide both email and password.");
        }

        const email = credentials.email.toLowerCase().trim();
        const [rows] = await pool.execute<UserRow[]>(
          `SELECT id, name, email, image, password FROM users WHERE email = ? LIMIT 1`,
          [email]
        );

        const user = rows[0];

        if (!user || !user.password) {
          throw new Error("Invalid email or password.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string }).id = (token.id as string) || token.sub;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
