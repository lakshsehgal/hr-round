import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// `prepare: false` makes this safe behind Supabase's transaction pooler
// (port 6543) and a no-op behind the session pooler / direct connection.
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 5,
});

export const db = drizzle(client, { schema });
