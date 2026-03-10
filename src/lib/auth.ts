import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Extend the session types
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

// Simple auth configuration for development
const providers = [
  Credentials({
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const email = credentials?.email as string;
      const password = credentials?.password as string;

      if (email && password === 'demo123') {
        return {
          id: email,
          email,
          name: email.split('@')[0],
        };
      }

      return null;
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-do-not-use-in-production',
});
