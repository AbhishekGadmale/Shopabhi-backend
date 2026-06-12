import { createClient } from "redis";
import { config } from "../config/config.js";

const redisClient = createClient({
  url: config.REDIS_URI,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("🚀 Redis connected successfully"));

// Connect to redis
(async () => {
  await redisClient.connect();
})();

export const clearCacheByPattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.error(`Error clearing cache by pattern ${pattern}:`, err);
  }
};

export default redisClient;
