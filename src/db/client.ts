import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __db?: DB };

function getDb(): DB {
  if (globalForDb.__db) return globalForDb.__db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  globalForDb.__db = drizzle(sql, { schema });
  return globalForDb.__db;
}

// Lazy proxy so importing this module never connects or throws at build time.
// First actual call to `db.select(...)` triggers initialisation.
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as unknown as object, prop, receiver);
  },
});
