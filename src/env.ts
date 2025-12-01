import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL"),
    DATABASE_URL_UNPOOLED: z.url("DATABASE_URL_UNPOOLED must be a valid URL"),
    // KSEF_TOKEN: z.string().min(1),
    // klucze do szyfrowania
  },
  client: {
    // zmienne publiczne (np. NEXT_PUBLIC_...)
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  },
});