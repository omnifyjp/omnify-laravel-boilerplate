import { defineConfig } from "@famgia/omnify-cli";
import japanPlugin from "@famgia/omnify-japan";
import laravelPlugin from "@famgia/omnify-laravel/plugin";
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
  plugins: [
    japanPlugin,
    // Laravel plugin with base path for monorepo
    laravelPlugin({
      base: "./backend/",
      generateRequests: true,
      generateResources: true,
    }),
  ],
  locale: {
    locales: ["ja", "en", "vi"],
    defaultLocale: "ja",
  },
  database: {
    driver: dbConnection,
    devUrl: "mysql://omnify:secret@localhost:3306/omnify",
  },
  output: {
    typescript: {
      path: "./frontend/src/omnify",
    },
  },
});
