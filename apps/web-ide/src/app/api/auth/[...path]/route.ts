import { auth } from '../../../../lib/auth/server';

/**
 * Catch-all route handler for Neon Auth.
 * Proxies incoming authentication requests (social OAuth, email signup/signin, session refresh)
 * to Managed Better Auth on Neon.
 */
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
