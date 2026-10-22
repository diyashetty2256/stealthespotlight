declare module "connect-pg-simple" {
  import type { Store } from "express-session";
  import type { Pool } from "pg";

  interface ConnectPgSimpleOptions {
    pool?: Pool;
    conString?: string;
    conObject?: Record<string, unknown>;
    tableName?: string;
    schemaName?: string;
    createTableIfMissing?: boolean;
    ttl?: number;
    disableTouch?: boolean;
    pruneSessionInterval?: number | false;
  }

  function connectPgSimple(session: typeof import("express-session")): {
    new (options?: ConnectPgSimpleOptions): Store;
  };

  export = connectPgSimple;
}
