/**
 * @fileoverview Drizzle Kit configuration for the AURELION database schema.
 *
 * Drizzle Kit is a CLI companion to Drizzle ORM that handles schema migrations
 * and introspection. This config file is consumed by the `drizzle-kit` binary
 * when running commands such as:
 *
 * ```bash
 * pnpm --filter @workspace/db run push    # Apply schema directly (dev mode)
 * pnpm --filter @workspace/db run studio  # Open Drizzle Studio GUI
 * ```
 *
 * **Migration strategy:** The project uses **push mode** during development,
 * meaning schema changes are applied directly to the database without
 * generating migration SQL files. This trades rollback safety for iteration
 * speed — acceptable for early-stage development but should be revisited
 * before production launch.
 *
 * @see {@link https://orm.drizzle.team/kit-docs/config-reference Drizzle Kit Config Reference}
 */

import { defineConfig } from "drizzle-kit";

/*
 * Guard against a missing connection string. This typically means the
 * developer forgot to start the local Postgres container or did not
 * source the .env file before running a Drizzle Kit command.
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  /**
   * Path to the barrel file that re-exports all table definitions.
   * Drizzle Kit scans this (and its transitive imports) to build the
   * full schema graph. The path is relative to this config file's
   * directory (`lib/db/`).
   */
  schema: "./src/schema/index.ts",

  /** PostgreSQL dialect — determines the SQL syntax Drizzle Kit generates. */
  dialect: "postgresql",

  /**
   * Connection credentials for the target database. Uses the same
   * `DATABASE_URL` that the runtime application connects to, ensuring
   * schema changes always target the correct database.
   */
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
