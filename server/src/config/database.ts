import pg from "pg";
import { newDb } from "pg-mem";
import { config } from "../config/env.js";

const { Pool: PgPool } = pg;
const primaryPool = new PgPool({ connectionString: config.databaseUrl });
let memoryPool: pg.Pool | null = null;
export let isMemoryDatabaseActive = false;

async function ensureWorkingPool(): Promise<pg.Pool> {
  if (memoryPool) return memoryPool;

  try {
    await primaryPool.query("SELECT 1");
    isMemoryDatabaseActive = false;
    return primaryPool;
  } catch {
    const db = newDb();
    const { Pool: MemoryPool } = db.adapters.createPg();
    memoryPool = new MemoryPool() as unknown as pg.Pool;
    isMemoryDatabaseActive = true;
    return memoryPool;
  }
}

export const pool = new Proxy(primaryPool, {
  get(target, prop, receiver) {
    if (prop === "query" || prop === "connect" || prop === "end") {
      return (...args: unknown[]) =>
        ensureWorkingPool().then((activePool) => {
          const method = (activePool as unknown as Record<string, unknown>)[String(prop)] as (...args: unknown[]) => unknown;
          return method.apply(activePool, args);
        });
    }

    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") {
      return (...args: unknown[]) => value.apply(target, args);
    }
    return value;
  },
});

export type Queryable = Pick<pg.Pool | pg.PoolClient, "query">;

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await (await ensureWorkingPool()).query<T>(text, params as never[]);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await (await ensureWorkingPool()).connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
