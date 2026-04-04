import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import activitiesRouter from "./activities";
import itinerariesRouter from "./itineraries";
import chatRouter from "./chat";
import purchasesRouter from "./purchases";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(activitiesRouter);
router.use(itinerariesRouter);
router.use(chatRouter);
router.use(purchasesRouter);
router.use(adminRouter);
router.use(dashboardRouter);

export default router;
