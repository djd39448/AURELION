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
 * 7. Rate limiting (general 100/15min, auth 10/15min, concierge 20/hr)
 * 8. Route handlers (all under /api prefix)
 *
 * @module api-server/app
 */

import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
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
// 7. RATE LIMITING
// ---------------------------------------------------------------------------
// Three tiers of rate limits to protect against abuse:
// - General: 100 req / 15 min per IP (applied globally to all /api routes)
// - Auth: 10 req / 15 min per IP (tighter limit on /api/auth/* endpoints)
// - AI concierge: 20 req / hour per IP (/api/chat/* — expensive LLM calls)
//
// Responses exceed the limit receive a 429 with a JSON error body.
// ---------------------------------------------------------------------------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 100,
  standardHeaders: "draft-8",  // Return RateLimit headers per draft-ietf-httpapi-ratelimit-headers-08
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down and try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many auth attempts — please wait before trying again." },
});

const conciergeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "AI concierge rate limit reached — please try again in an hour." },
});

// Apply general limiter to all /api routes, then tighter limits on specific paths.
app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/chat", conciergeLimiter);

// ---------------------------------------------------------------------------
// 8. ROUTE HANDLERS
// ---------------------------------------------------------------------------
// All API routes are mounted under the /api prefix. The router is defined in
// ./routes and contains sub-routers for auth, itineraries, purchases, etc.
// ---------------------------------------------------------------------------
app.use("/api", router);

export default app;
