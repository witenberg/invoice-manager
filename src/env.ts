import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
    DATABASE_URL_UNPOOLED: z.url("DATABASE_URL_UNPOOLED must be a valid URL"),
    KSEF_BASE_URL: z.url("KSEF_BASE_URL must be a valid URL"),
    APP_SECRET_KEY: z.string().min(32).max(32),
  },
  client: {
    // zmienne publiczne (np. NEXT_PUBLIC_...)
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    KSEF_BASE_URL: process.env.KSEF_BASE_URL,
    APP_SECRET_KEY: process.env.APP_SECRET_KEY,
  },
});