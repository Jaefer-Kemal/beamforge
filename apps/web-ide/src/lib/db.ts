import { neon } from '@neondatabase/serverless';

/**
 * Returns a Neon serverless SQL client if DATABASE_URL is set in environment.
 * If unset, returns null to allow seamless fallback to browser storage.
 */
export function getNeonDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return null;
  }
  return neon(dbUrl);
}

