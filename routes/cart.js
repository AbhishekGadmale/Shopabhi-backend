import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as cartController from "../controllers/cartController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", cartController.getCart);
router.post("/sync", cartController.syncCart);

export default router;
