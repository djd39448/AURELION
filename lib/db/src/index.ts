/**
 * @fileoverview Database connection module for the AURELION Aruba adventure tourism platform.
 *
 * This module is the single source of truth for all database access across the
 * monorepo. Every route handler, background job, and utility that needs the
 * database imports from `@workspace/db`, which resolves to this file.
 *
 * **Architecture notes:**
 * - A single {@link https://node-postgres.com/ node-postgres} {@link Pool} is
 *   created at module-load time (singleton pattern). Because Node.js caches
 *   modules, all consumers share the same pool and its connection limits.
 * - {@link https://orm.drizzle.team/ Drizzle ORM} wraps the pool to provide a
 *   type-safe query builder. The full schema is passed in so that Drizzle can
 *   resolve relations and infer return types.
 * - All schema definitions (tables, relations, enums) are re-exported from
 *   this barrel so consumers can do:
 *   ```ts
 *   import { db, usersTable, itinerariesTable } from "@workspace/db";
 *   ```
 *
 * @module @workspace/db
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/*
 * Fail fast if DATABASE_URL is missing. This prevents the app from starting
 * with a broken database configuration and producing confusing downstream
 * errors (e.g., "pool has been destroyed").
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * Raw node-postgres connection pool backed by `DATABASE_URL`.
 *
 * Use this only when you need capabilities that Drizzle does not expose
 * (e.g., `LISTEN`/`NOTIFY`, advisory locks, or `COPY`). For all standard
 * CRUD operations, prefer the Drizzle {@link db} instance instead.
 *
 * The pool is created once at module load time and shared across the entire
 * process — do **not** call `pool.end()` unless the process is shutting down.
 *
 * @example
 * ```ts
 * import { pool } from "@workspace/db";
 * const { rows } = await pool.query("SELECT NOW()");
 * ```
 */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Drizzle ORM instance pre-configured with the full AURELION schema.
 *
 * This is the primary database interface for the entire application. It
 * provides type-safe queries, automatic relation resolution, and composable
 * query building.
 *
 * @example
 * ```ts
 * import { db, usersTable } from "@workspace/db";
 * import { eq } from "drizzle-orm";
 *
 * const user = await db.select()
 *   .from(usersTable)
 *   .where(eq(usersTable.email, email));
 * ```
 */
export const db = drizzle(pool, { schema });

/**
 * Re-export every schema definition (tables, relations, enums, types) so that
 * consumers only need a single import source:
 *
 * ```ts
 * import { db, usersTable, purchasesTable } from "@workspace/db";
 * ```
 */
export * from "./schema";
