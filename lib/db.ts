import { neon } from '@neondatabase/serverless';

// Vercel's Neon integration sets one of these depending on version/setup.
// We check them in order so we don't have to guess which one applies.
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  throw new Error(
    'No database connection string found. Check the Environment Variables ' +
      'tab in your Vercel project settings and confirm one of DATABASE_URL, ' +
      'POSTGRES_URL, DATABASE_URL_UNPOOLED, or POSTGRES_URL_NON_POOLING exists.'
  );
}

export const sql = neon(connectionString);
