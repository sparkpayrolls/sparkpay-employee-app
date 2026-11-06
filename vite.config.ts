/// <reference types="vitest/config" />
import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    // Public values only: anything defined here ships in the client bundle.
    // API_URL keeps existing deployments working; once VITE_API_URL is set
    // in Vercel, remove this define.
    define: {
      "process.env.API_URL": JSON.stringify(env.API_URL),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    test: {
      environment: "jsdom",
      include: ["**/*.test.{ts,tsx}"],
      exclude: ["node_modules/**", "dist/**"],
    },
  };
});
