import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import * as orderController from "../controllers/orderController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", orderController.getOrders);
router.post("/", orderController.createOrder);
router.post("/preview", orderController.previewOrder);
router.post("/validate-coupon", orderController.validateCoupon);
router.post("/razorpay", orderController.createRazorpayOrder);
router.post("/verify", orderController.verifyPayment);

export default router;
