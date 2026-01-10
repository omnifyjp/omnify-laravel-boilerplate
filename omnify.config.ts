import { defineConfig } from "@famgia/omnify-cli";
import { existsSync, readFileSync } from "fs";
import { parse } from "yaml";

// Read database driver: docker-compose.yml → backend/.env → default
function getDbDriver(): string {
  // 1. Try docker-compose.yml
  if (existsSync("./docker-compose.yml")) {
    const dockerCompose = parse(readFileSync("./docker-compose.yml", "utf8"));
    const env = dockerCompose.services?.backend?.environment?.find(
      (e: string) => e.startsWith("DB_CONNECTION=")
    );
    if (env) return env.split("=")[1];
  }

  // 2. Try backend/.env
  if (existsSync("./backend/.env")) {
    const envContent = readFileSync("./backend/.env", "utf8");
    const match = envContent.match(/^DB_CONNECTION=(.+)$/m);
    if (match) return match[1];
  }

  // 3. Default
  return "mysql";
}

const dbConnection = getDbDriver() as "mysql" | "postgres" | "sqlite";

export default defineConfig({
  schemasDir: "./.omnify/schemas",
  locale: {
    locales: ["ja", "en"],
    defaultLocale: "ja",
  },
  database: {
    driver: dbConnection,
  },
  output: {
    laravel: {
      migrationsPath: "./backend/database/migrations/omnify",
      modelsPath: "./backend/app/Models",
    },
    typescript: {
      path: "./frontend/src/types/model",
    },
  },
});
