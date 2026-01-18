import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import Order from "../models/Order.js";

const router = express.Router();
/**
 * GET /api/orders
 * Returns orders for the authenticated user
 */

// GET /api/orders (protected)
router.get("/",authMiddleware,async(req,res)=>{
 try{
  const orders= await Order.find({userId:req.user.id}).sort({createdAt:-1})
  res.json({orders});
 } catch(err){
  res.status(500).json({error:"Failed to Fetch Orders"})
 }
});

/**
 * POST /api/orders
 * Creates an order for the authenticated user
 * Body: { items: [{ name, price, quantity }], total, details: { name, address } }
 */
router.post("/",authMiddleware,async (req,res)=>{
  const {items,total,details}= req.body;

//Basic Validation 
if(!Array.isArray(items)||items.length==0){
  return res.status(400).json({error:"Items are Required"});
}
if (!total || !details?.name || !details?.address){
  return res.status(400).json({error:"Total and Details (name,address) are Required"});
}
try{
  const order= new Order({
    userId:req.user.id,
    items,
    total,
    details,
  });
  await order.save();
  res.status(201).json({message:"Order Placed Successfully",order});
} catch(err){
  res.status(500).json({error:"Failed to place Order"});
  }
});

export default router;