import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });
 
export type User = typeof schema.user.$inferSelect;
export type Session = typeof schema.session.$inferSelect;
export type UserInsert = typeof schema.user.$inferInsert;