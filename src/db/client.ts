import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __pg?: ReturnType<typeof postgres>;
  __db?: DB;
};

function getDb(): DB {
  if (globalForDb.__db) return globalForDb.__db;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  // `prepare: false` makes this safe behind Supabase's transaction pooler
  // (port 6543) and a no-op behind the session pooler / direct connection.
  globalForDb.__pg = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 5,
  });
  globalForDb.__db = drizzle(globalForDb.__pg, { schema });
  return globalForDb.__db;
}

// Lazy proxy so importing this module never connects or throws at build time.
// First actual call to `db.select(...)` triggers initialisation.
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as unknown as object, prop, receiver);
  },
});
