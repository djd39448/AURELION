/**
 * @fileoverview Pino logger configuration for the AURELION API server.
 *
 * Provides a pre-configured, structured JSON logger used throughout the API.
 * All route handlers receive a per-request child logger via pino-http
 * (`req.log`), but this base instance is also imported directly for logging
 * outside the request lifecycle (e.g., startup, shutdown, background tasks).
 *
 * **Security:** Sensitive headers (Authorization, Cookie, Set-Cookie) are
 * redacted from log output to prevent credential leakage into log aggregators
 * or stdout captures.
 *
 * @module api-server/lib/logger
 */

import pino from "pino";

/** Whether the server is running in production mode. */
const isProduction = process.env.NODE_ENV === "production";

/**
 * Application-wide Pino logger instance.
 *
 * Configuration details:
 * - **level**: Controlled by the `LOG_LEVEL` env var; defaults to `"info"`.
 *   Set to `"debug"` or `"trace"` during local troubleshooting.
 * - **redact**: Strips `authorization` and `cookie` headers from serialized
 *   request/response objects. This prevents bearer tokens, session cookies,
 *   and Set-Cookie values from appearing in logs — critical for SOC 2 and
 *   GDPR compliance.
 * - **transport**: In development, logs are piped through
 *   {@link https://github.com/pinojs/pino-pretty pino-pretty} for
 *   human-readable, colorized output. In production, raw JSON is emitted
 *   for ingestion by log aggregators (Datadog, CloudWatch, etc.).
 *
 * @example
 * ```ts
 * import { logger } from "./lib/logger";
 * logger.info({ userId: 42 }, "User logged in");
 * logger.error({ err }, "Payment processing failed");
 * ```
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization", // Bearer tokens, API keys
    "req.headers.cookie",        // Session cookies
    "res.headers['set-cookie']", // New cookies being set in the response
  ],
  /*
   * In development, pipe output through pino-pretty for colorized,
   * multi-line log output that is easier to scan in a terminal.
   * In production, skip the transport entirely — raw JSON to stdout
   * is faster and compatible with structured log ingestion pipelines.
   */
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
