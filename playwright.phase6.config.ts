import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "phase6-security.spec.ts",
  workers: 1,
  use: { baseURL: process.env.TEST_BASE_URL || "http://localhost:3000" },
});
