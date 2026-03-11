import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// NextAuth v4 route handler
const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler;
