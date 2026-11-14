import { createNeonAuth } from '@neon/auth/next/server';

const defaultBaseUrl = 'https://ep-proud-truth-ayiefcib.neonauth.c-5.us-east-2.aws.neon.tech/beamforge/auth';
const defaultCookieSecret = 'zny7/C7HyJmVnNrKkVMi7NKLvyh9gGyYYcJSjK98bsM=';

/**
 * Server-side Neon Auth client.
 * Provides unified server-side Better Auth methods (getSession, signIn, etc.),
 * as well as the API route proxy handler.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || defaultBaseUrl,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || defaultCookieSecret,
  },
});
