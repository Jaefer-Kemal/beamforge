'use client';

import { createAuthClient } from '@neon/auth/next';

/**
 * Client-side Neon Auth client.
 * Provides hooks like `useSession`, `signIn`, `signUp`, and `signOut`
 * pre-wired to the `/api/auth` proxy route.
 */
export const authClient = createAuthClient();

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
