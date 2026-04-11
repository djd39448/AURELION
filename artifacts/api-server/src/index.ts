/**
 * @fileoverview Express server entry point for the AURELION API.
 *
 * This file is the Node.js process entry point — it imports the fully
 * configured Express app, binds it to a port, and starts listening.
 *
 * **Environment loading:** The process is started with the
 * `--env-file=../../.env` Node.js flag (see package.json scripts), which
 * loads environment variables from the monorepo root `.env` file *before*
 * any application code runs. This means `process.env` is already populated
 * by the time this module executes.
 *
 * @module api-server/index
 */

import app from "./app";
import { logger } from "./lib/logger";

// ---------------------------------------------------------------------------
// STRUCTURED ERROR MONITORING
// ---------------------------------------------------------------------------
// Log unhandled errors and promise rejections to Pino at error level so they
// appear in Railway's structured log stream and can be alerted on.
// ---------------------------------------------------------------------------
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — process will exit");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

/**
 * Port the HTTP server listens on.
 * Defaults to 3001 for local development; production deployments set PORT
 * via the hosting platform's environment.
 */
const port = Number(process.env["PORT"]) || 3001;

/**
 * Start the Express HTTP server.
 *
 * The callback fires once the server is bound and ready to accept connections.
 * On failure (e.g., EADDRINUSE), we log the error and exit with a non-zero
 * code so the process supervisor (Docker, systemd, etc.) can restart it.
 */
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
