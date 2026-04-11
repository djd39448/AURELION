/**
 * @module routes/health
 * @description Health check endpoint for the AURELION API server.
 *
 * Used by:
 * - Uptime monitors (e.g., Pingdom, UptimeRobot) for availability alerting
 * - Load balancers (e.g., AWS ALB/NLB, Replit) for instance health probing
 * - Kubernetes / container orchestrators for liveness checks
 * - Paperclip AI agents to verify API reachability before issuing requests
 *
 * The response body is validated through the shared {@link HealthCheckResponse}
 * Zod schema to guarantee a stable contract.
 */
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const version = "1.0.0";

const router: IRouter = Router();

/**
 * @route GET /api/healthz
 * @auth None
 * @returns {{ status: "ok" }} — Zod-validated health status object
 * @throws {500} If Zod validation unexpectedly fails (should never happen)
 *
 * @example
 * // Response
 * { "status": "ok" }
 */
router.get("/healthz", (_req, res): void => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * @route GET /api/health
 * @auth None
 * @returns {{ status: "ok", timestamp: string, version: string }}
 *
 * Extended health check that includes server timestamp (ISO 8601) and the
 * package version. Used by monitoring dashboards and deployment verification.
 *
 * @example
 * // Response
 * { "status": "ok", "timestamp": "2026-04-11T14:00:00.000Z", "version": "0.0.0" }
 */
router.get("/health", (_req, res): void => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version });
});

export default router;
