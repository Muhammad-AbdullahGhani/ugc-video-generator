import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const hasGoogleAuth = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID.trim().length > 0 &&
  process.env.GOOGLE_CLIENT_SECRET.trim().length > 0
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...(hasGoogleAuth
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
          }),
        ]
      : []),
    Credentials({
      id: "demo-guest",
      name: "Demo Guest",
      credentials: {
        name: { label: "Name", type: "text", placeholder: "Creator Guest" },
        email: { label: "Email", type: "email", placeholder: "guest@example.com" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string) || "guest@reelforge.ai";
        const name = (credentials?.name as string) || "Creator Guest";
        return {
          id: "guest-user-" + Date.now(),
          name,
          email,
          image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        };
      },
    }),
  ],
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "reelforge-dev-secret-key-at-least-32-chars-long",
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
});
