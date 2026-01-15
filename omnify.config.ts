/**
 * Omnify Configuration
 *
 * This configuration generates:
 * - Laravel migrations, models, requests, resources
 * - TypeScript types and Zod schemas
 * - SSO Client package models in packages/omnify-sso-client
 */

import type { OmnifyConfig } from "@famgia/omnify";
import japanPlugin from "@famgia/omnify-japan";
import laravelPlugin from "@famgia/omnify-laravel/plugin";
import { existsSync, readFileSync } from "fs";
import { parse } from "yaml";

// Read database driver: docker-compose.yml → backend/.env → default
function getDbDriver(): "mysql" | "postgres" | "sqlite" {
  // 1. Try docker-compose.yml
  if (existsSync("./docker-compose.yml")) {
    const dockerCompose = parse(readFileSync("./docker-compose.yml", "utf8"));
    const env = dockerCompose.services?.backend?.environment?.find(
      (e: string) => e.startsWith("DB_CONNECTION=")
    );
    if (env) return env.split("=")[1] as "mysql" | "postgres" | "sqlite";
  }

  // 2. Try backend/.env
  if (existsSync("./backend/.env")) {
    const envContent = readFileSync("./backend/.env", "utf8");
    const match = envContent.match(/^DB_CONNECTION=(.+)$/m);
    if (match) return match[1] as "mysql" | "postgres" | "sqlite";
  }

  // 3. Default
  return "mysql";
}

const config: OmnifyConfig = {
  // Main schemas directory
  schemasDir: "./.omnify/schemas",

  // SSO Client package schemas
  additionalSchemaPaths: [
    {
      path: "./packages/omnify-sso-client/database/schemas",
      namespace: "Sso",
      output: {
        laravel: {
          base: "./packages/omnify-sso-client",
          modelsNamespace: "Omnify\\SsoClient\\Models",
        },
      },
    },
  ],

  // Plugins
  plugins: [
    japanPlugin,
    laravelPlugin({ base: "./backend/" }),
  ],

  // Locale configuration
  locale: {
    locales: ["ja", "en", "vi"],
    defaultLocale: "ja",
  },

  // Database configuration
  database: {
    driver: getDbDriver(),
    devUrl: "mysql://omnify:secret@localhost:3306/omnify",
  },

  // Output configuration
  output: {
    typescript: {
      path: "./frontend/src/omnify",
    },
  },
};

export default config;
