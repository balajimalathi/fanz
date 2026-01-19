import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

// Load environment-specific .env file first (takes precedence), then .env as fallback
// dotenv.config() by default doesn't override existing variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: envFile });
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });