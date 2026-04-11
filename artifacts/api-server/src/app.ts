/**
 * @fileoverview Express application configuration for the AURELION API server.
 *
 * This module assembles the middleware pipeline and mounts all route handlers.
 * **Middleware order is critical** — reordering middleware can break Stripe
 * webhook verification, CORS pre-flight handling, or session management.
 *
 * Pipeline (in order):
 * 1. Request logging (pino-http)
 * 2. CORS (allow all origins with credentials)
 * 3. Raw body parser (Stripe webhooks only — must precede JSON parser)
 * 4. JSON body parser (all other routes)
 * 5. URL-encoded body parser (form submissions)
 * 6. Session management (express-session with 7-day cookies)
 * 7. Route handlers (all under /api prefix)
 *
 * @module api-server/app
 */

import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ---------------------------------------------------------------------------
// 1. REQUEST LOGGING
// ---------------------------------------------------------------------------
// Pino-http attaches a child logger to every request (req.log) and
// automatically logs the response status + latency when the response finishes.
// Custom serializers strip query strings from URLs (to avoid logging PII in
// query params) and limit the response payload to just the status code.
// ---------------------------------------------------------------------------
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0], // Strip query string to avoid logging PII or tokens
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ---------------------------------------------------------------------------
// 2. CORS
// ---------------------------------------------------------------------------
// `origin: true` reflects the request's Origin header back as the
// Access-Control-Allow-Origin value. Combined with `credentials: true`, this
// allows the frontend (which may run on a different port or domain during
// development) to send and receive session cookies.
//
// NOTE: In production, consider restricting `origin` to the actual frontend
// domain(s) to prevent cross-site request forgery from arbitrary origins.
// ---------------------------------------------------------------------------
app.use(cors({
  origin: true,
  credentials: true,
}));

// ---------------------------------------------------------------------------
// 3. RAW BODY PARSER (Stripe webhooks)
// ---------------------------------------------------------------------------
// IMPORTANT: This route-specific raw body parser MUST be registered BEFORE the
// global JSON body parser below. Stripe's webhook signature verification
// (`stripe.webhooks.constructEvent`) requires the raw, unparsed request body.
// If express.json() parses the body first, the raw bytes are lost and
// signature verification will always fail.
// ---------------------------------------------------------------------------
app.use("/api/purchases/webhook", express.raw({ type: "application/json" }));

// ---------------------------------------------------------------------------
// 4 & 5. JSON + URL-ENCODED BODY PARSERS
// ---------------------------------------------------------------------------
// Standard Express body parsers for the rest of the API. The URL-encoded
// parser with `extended: true` uses the `qs` library, which supports nested
// objects in form data.
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// 6. SESSION MANAGEMENT
// ---------------------------------------------------------------------------
// Sessions are stored server-side (default MemoryStore — swap to a persistent
// store like connect-pg-simple before scaling beyond a single process).
//
// Cookie settings:
// - `secure`: true in production (HTTPS only), false in dev (HTTP localhost)
// - `httpOnly`: true always — prevents client-side JS from reading the cookie,
//   mitigating XSS-based session theft
// - `maxAge`: 7 days (604,800,000 ms) — users stay logged in for a week
// - `sameSite`: "none" in production (required for cross-origin cookies when
//   the API and frontend are on different domains); "lax" in dev (safer default
//   that still allows top-level navigations)
//
// SESSION_SECRET: Falls back to a hardcoded dev default so local development
// works without extra setup. In production, this MUST be set to a strong,
// unique secret via environment variable.
// ---------------------------------------------------------------------------
app.use(session({
  secret: process.env.SESSION_SECRET ?? "aurelion-session-secret-dev",
  resave: false,              // Don't re-save session if it wasn't modified
  saveUninitialized: false,   // Don't create sessions for unauthenticated requests
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
}));

// ---------------------------------------------------------------------------
// 7. ROUTE HANDLERS
// ---------------------------------------------------------------------------
// All API routes are mounted under the /api prefix. The router is defined in
// ./routes and contains sub-routers for auth, itineraries, purchases, etc.
// ---------------------------------------------------------------------------
app.use("/api", router);

export default app;
