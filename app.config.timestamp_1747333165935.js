// app.config.ts
import { createApp } from "vinxi";
import reactRefresh from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { config } from "vinxi/plugins/config";

// src/env.ts
import { z } from "zod";
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  // Authentication
  JWT_SECRET: z.string().min(32),
  // OpenAI API for AI features
  OPENAI_API_KEY: z.string(),
  // Optional: S3/Minio configuration for file storage
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional()
});
var env = envSchema.parse(process.env);

// app.config.ts
var app_config_default = createApp({
  server: {
    preset: "node-server",
    // change to 'netlify' or 'bun' or anyof the supported presets for nitro (nitro.unjs.io)
    experimental: {
      asyncContext: true
    }
  },
  routers: [
    {
      type: "static",
      name: "public",
      dir: "./public"
    },
    {
      type: "http",
      name: "trpc",
      base: "/trpc",
      handler: "./src/server/api/handler.ts",
      target: "server",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL ? [env.BASE_URL.split("://")[1]] : void 0
          }
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"]
        })
      ]
    },
    {
      type: "spa",
      name: "client",
      handler: "./index.html",
      target: "browser",
      plugins: () => [
        config("allowedHosts", {
          // @ts-ignore
          server: {
            allowedHosts: env.BASE_URL ? [env.BASE_URL.split("://")[1]] : void 0
          }
        }),
        tsConfigPaths({
          projects: ["./tsconfig.json"]
        }),
        TanStackRouterVite({
          target: "react",
          autoCodeSplitting: true,
          routesDirectory: "./src/routes",
          generatedRouteTree: "./src/routeTree.gen.ts"
        }),
        reactRefresh()
      ]
    }
  ]
});
export {
  app_config_default as default
};
