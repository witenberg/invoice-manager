import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
    DATABASE_URL_UNPOOLED: z.url("DATABASE_URL_UNPOOLED must be a valid URL"),
    KSEF_BASE_URL: z.url("KSEF_BASE_URL must be a valid URL"),
    APP_SECRET_KEY: z.string().length(32, "APP_SECRET_KEY must be exactly 32 characters for AES-256"),
    NEXTAUTH_URL: z.url("NEXTAUTH_URL must be a valid URL"),
    GOOGLE_CLIENT_ID: z.string("GOOGLE_CLIENT_ID must be a valid string"),
    GOOGLE_CLIENT_SECRET: z.string("GOOGLE_CLIENT_SECRET must be a valid string"),
  },
  client: {
    // Public environment variables (NEXT_PUBLIC_*)
  },
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    KSEF_BASE_URL: process.env.KSEF_BASE_URL,
    APP_SECRET_KEY: process.env.APP_SECRET_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
});