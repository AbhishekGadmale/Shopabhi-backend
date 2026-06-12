import redisClient from "./utils/redisClient.js";
import emailQueue from "./queues/emailQueue.js";
import mongoose from "mongoose";
import { config } from "./config/config.js";

async function verifyFeatures() {
  console.log("🔍 Starting Feature Verification...");

  // 1. Check Redis Connection
  try {
    await redisClient.set("test_key", "verification_success", { EX: 10 });
    const val = await redisClient.get("test_key");
    if (val === "verification_success") {
      console.log("✅ Redis Connection & Caching: WORKING");
    } else {
      console.log("❌ Redis Connection & Caching: FAILED (Value mismatch)");
    }
  } catch (err) {
    console.log("❌ Redis Connection & Caching: FAILED (Check if Redis is running)");
    console.error(err);
  }

  // 2. Check BullMQ Queue
  try {
    const job = await emailQueue.add("testJob", { email: "test@example.com" });
    if (job.id) {
      console.log(`✅ BullMQ Queue: WORKING (Job Enqueued: ${job.id})`);
    } else {
      console.log("❌ BullMQ Queue: FAILED (No job ID returned)");
    }
  } catch (err) {
    console.log("❌ BullMQ Queue: FAILED");
    console.error(err);
  }

  // 3. Clean up
  try {
    await redisClient.del("test_key");
    // We don't close the client here as it might be used by other parts if this were a live app, 
    // but for a script we should.
    await redisClient.quit();
    await emailQueue.close();
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

verifyFeatures();
