import { type Config } from "drizzle-kit";
import { env } from "./src/env";

export default {
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL_UNPOOLED,
  },
  tablesFilter: ["!libsql_wasm_func_table"],
} satisfies Config;