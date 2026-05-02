import { v4 as uuidv4 } from 'uuid';
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const logEvent = (id, event, details) => {
  console.log(JSON.stringify({ 
    timestamp: new Date().toISOString(), 
    correlationId: id,
    event, 
    details 
  }));
};

export const startOrderExpiryJob = () => {
  // Run every 2 minutes
  setInterval(async () => {
    const jobCorrelationId = `job-expiry-${uuidv4()}`;
    try {
      const now = new Date();
      
      // Find orders that are pending and their expiration time has passed
      // We don't lock here yet, we'll lock atomically in the loop
      const expiredOrders = await Order.find({
        paymentStatus: "Pending",
        expiresAt: { $lt: now }
      }).limit(50); // Process in batches

      if (expiredOrders.length === 0) return;

      logEvent(jobCorrelationId, "expiry_job_started", { count: expiredOrders.length });

      for (const order of expiredOrders) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // ATOMIC TRANSITION: Only cancel if still Pending and still expired
          // This serves as our distributed lock
          const lockedOrder = await Order.findOneAndUpdate(
            { 
              _id: order._id, 
              paymentStatus: "Pending", 
              expiresAt: { $lt: now } 
            },
            { 
              $set: { 
                paymentStatus: "Failed", 
                status: "Cancelled" 
              },
              $unset: { expiresAt: "" }
            },
            { session, new: true }
          );

          if (!lockedOrder) {
            // Someone else (another instance or verifyPayment) processed it
            await session.abortTransaction();
            session.endSession();
            continue;
          }

          // Restore stock for all items snapshot
          for (const item of lockedOrder.items) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stock: item.quantity } },
              { session }
            );
          }

          await session.commitTransaction();
          session.endSession();

          logEvent(jobCorrelationId, "order_expired_and_stock_restored", { orderId: lockedOrder._id });
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          logEvent(jobCorrelationId, "expiry_job_error_for_order", { orderId: order._id, reason: err.message });
        }
      }
    } catch (err) {
      logEvent(jobCorrelationId, "expiry_job_fatal_error", { reason: err.message });
    }
  }, 2 * 60 * 1000); 
};
