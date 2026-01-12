import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/utils/prisma"; // your prisma.ts wrapper
import { sendOTPEmail, verifyOTP } from "@/utils/email/otp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },

  providers: [
    // 🔐 Email + Password
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text", optional: true },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("User not found");
        }

        const valid = await bcrypt.compare(credentials.password, user.password);

        if (!valid) {
          throw new Error("Invalid password");
        }

        // Step 1: Password verified → Send OTP
        if (!credentials.otp) {
          await sendOTPEmail(user.email);
          throw new Error("OTP_REQUIRED");
        }

        // Step 2: Verify OTP
        const isValidOTP = await verifyOTP(user.email, credentials.otp);

        if (!isValidOTP) {
          throw new Error("Invalid OTP");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),

    // 🔑 Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
