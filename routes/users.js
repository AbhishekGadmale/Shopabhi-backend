import express from "express";
import * as userController from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);

router.post("/addresses", userController.addAddress);
router.delete("/addresses/:addressId", userController.deleteAddress);
router.put("/addresses/:addressId/default", userController.setDefaultAddress);

router.get("/wishlist", userController.getWishlist);
router.post("/wishlist", userController.toggleWishlist);

export default router;
