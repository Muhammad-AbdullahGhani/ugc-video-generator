import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

/**
 * The demo-guest provider authenticates anyone as any identity without
 * verification. It exists so the demo can be clicked through without Google
 * credentials, and `lib/env.ts` keeps it off unless explicitly enabled — and
 * refuses to enable it in production at all.
 *
 * Guests get a random opaque id (not a timestamp, which collides and rotates on
 * every sign-in) inside a reserved, unroutable email namespace, so a guest
 * session can never collide with or impersonate a real Google account.
 */
const demoGuestProvider = Credentials({
  id: "demo-guest",
  name: "Demo Guest",
  credentials: {
    name: { label: "Name", type: "text", placeholder: "Creator Guest" },
  },
  async authorize(credentials) {
    const requested = typeof credentials?.name === "string" ? credentials.name.trim() : "";
    const name = requested.slice(0, 40) || "Creator Guest";
    const id = `guest_${randomUUID()}`;

    log.info("guest session issued", { id });

    return {
      id,
      name,
      // Reserved namespace: `.invalid` is guaranteed never to resolve (RFC 2606),
      // so a guest identity cannot shadow a real user's email.
      email: `${id}@guest.invalid`,
      image: null,
    };
  },
});

if (env.auth.demoGuestEnabled) {
  log.warn("demo-guest provider is ENABLED — anyone can sign in without verification");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    ...(env.auth.googleConfigured
      ? [
          Google({
            clientId: env.auth.googleClientId!,
            clientSecret: env.auth.googleClientSecret!,
          }),
        ]
      : []),
    ...(env.auth.demoGuestEnabled ? [demoGuestProvider] : []),
  ],
  // No fallback. A hardcoded default secret lets anyone holding the source forge
  // a session; `lib/env.ts` fails the boot instead.
  secret: env.auth.secret,
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
});

/**
 * The single source of truth for "who is this request".
 *
 * Returns the stable provider subject only. Never fall back to email: emails are
 * user-supplied on some providers, and a dual id-or-email key is how cross-user
 * reads happen.
 */
export async function currentUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (err) {
    log.warn("session resolution failed", { err: err as Error });
    return null;
  }
}
