import { Queue } from "bullmq";
import { config } from "../config/config.js";

const emailQueue = new Queue("emailQueue", {
  connection: {
    url: config.REDIS_URI,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export default emailQueue;
