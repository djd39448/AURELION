/**
 * @module routes/index
 * @description Central route aggregator for the AURELION API server.
 *
 * Mounts all route groups onto a single Express router that is then
 * attached to the application at the `/api` prefix (see server bootstrap).
 *
 * ## Route groups and their base paths
 *
 * | Module        | Base path            | Auth required | Description                                    |
 * |---------------|----------------------|---------------|------------------------------------------------|
 * | health        | `/healthz`           | None          | Liveness probe for uptime monitors / LBs       |
 * | auth          | `/auth/*`            | Varies        | Session-based authentication (register/login)   |
 * | activities    | `/activities/*`      | None          | Public activity browsing and search             |
 * | itineraries   | `/itineraries/*`     | Required      | User itinerary CRUD and item management         |
 * | shared        | `/shared/*`          | None          | Public shared itinerary view (share token auth) |
 * | chat          | `/chat/*`            | Required      | AI concierge chat (Premium tier only)           |
 * | purchases     | `/purchases/*`       | Required*     | Stripe checkout and webhook processing          |
 * | admin         | `/admin/*`           | Admin only    | Activity management and URL ingestion           |
 * | dashboard     | `/dashboard/*`       | Required      | Aggregate stats for the user dashboard          |
 * | account       | `/account/*`         | Required      | Account profile and itinerary history           |
 *
 * *purchases/webhook is unauthenticated but verified via Stripe signature.
 *
 * @remarks
 * Consumed by Paperclip AI agents programmatically. Each sub-router is
 * self-contained and registers its own path prefixes.
 */
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import activitiesRouter from "./activities";
import itinerariesRouter from "./itineraries";
import sharedRouter from "./shared";
import chatRouter from "./chat";
import purchasesRouter from "./purchases";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(activitiesRouter);
router.use(itinerariesRouter);
router.use(sharedRouter);
router.use(chatRouter);
router.use(purchasesRouter);
router.use(adminRouter);
router.use(dashboardRouter);
router.use(accountRouter);

export default router;
