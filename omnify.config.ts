import { defineConfig } from "@famgia/omnify-cli";

export default defineConfig({
  schemasDir: "./.omnify/schemas",
  database: {
    driver: "sqlite",
  },
  output: {
    laravel: {
      migrationsPath: "./backend/database/migrations/omnify",
    },
    typescript: {
      path: "./frontend/src/types/model",
    },
  },
});
