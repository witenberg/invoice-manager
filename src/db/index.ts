import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Database Connection Setup
 * Uses Neon serverless driver for Vercel edge functions
 */

// 1. Configure SQL connection
const sql = neon(env.DATABASE_URL);

// 2. Singleton for development mode (prevents connection leaks during hot reload)
const globalForDb = global as unknown as {
  conn: ReturnType<typeof drizzle> | undefined;
};

// 3. Initialize Drizzle instance
export const db = globalForDb.conn ?? drizzle(sql, { schema });

// 4. Cache connection in development mode
if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = db;
}