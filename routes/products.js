import express from "express";
import * as productController from "../controllers/productController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", productController.getAllProducts);
router.get("/categories", productController.getCategories);
router.get("/:id", productController.getProduct);
router.get("/:id/reviews", productController.getProductReviews);
router.post("/:id/reviews", authMiddleware, productController.createProductReview);

export default router;
