import { Worker } from "bullmq";
import { config } from "../config/config.js";
import sendEmail from "../utils/email.js";

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    console.log(`Processing email job ${job.id} for ${job.data.email}`);
    const { email, subject, message } = job.data;
    
    await sendEmail({
      email,
      subject,
      message,
    });
  },
  {
    connection: {
      url: config.REDIS_URI,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);
});

export default emailWorker;
