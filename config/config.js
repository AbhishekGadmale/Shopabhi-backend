import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().transform(Number).default("5000"),
  MONGO_URI: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(10),
  ACCESS_TOKEN_EXPIRES: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(10),
  REFRESH_TOKEN_EXPIRES: z.string().default("30d"),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error("❌ Invalid environment variables:", envVars.error.format());
  process.exit(1);
}

const {
  NODE_ENV,
  PORT,
  MONGO_URI,
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_EXPIRES,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
} = envVars.data;

export const config = {
  NODE_ENV,
  PORT,
  MONGO_URI,
  JWT_SECRET: ACCESS_TOKEN_SECRET,
  JWT_EXPIRES_IN: ACCESS_TOKEN_EXPIRES,
  JWT_REFRESH_SECRET: REFRESH_TOKEN_SECRET,
  JWT_REFRESH_EXPIRES_IN: REFRESH_TOKEN_EXPIRES,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
};
