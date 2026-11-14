import { createNeonAuth } from '@neon/auth/next/server';

/**
 * Server-side Neon Auth client.
 * Provides unified server-side Better Auth methods (getSession, signIn, etc.),
 * as well as the API route proxy handler.
 * Reads runtime credentials from environment variables without hardcoded secrets.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || 'https://auth.neon.tech',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || 'temporary-dev-cookie-secret-placeholder-min-32-chars-long',
  },
});

