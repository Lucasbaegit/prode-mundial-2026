import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("secretos y env", () => {
  it("el frontend no declara tokens privados VITE", () => {
    const viteEnv = readFileSync("src/vite-env.d.ts", "utf8");

    expect(viteEnv).not.toContain("VITE_API_FOOTBALL_KEY");
    expect(viteEnv).not.toContain("VITE_SPORTMONKS_API_TOKEN");
    expect(viteEnv).not.toContain("VITE_FOOTBALL_DATA_API_TOKEN");
  });

  it(".env.example no incluye claves reales", () => {
    const envExample = readFileSync(".env.example", "utf8");

    expect(envExample).toContain("FOOTBALL_DATA_API_TOKEN=");
    expect(envExample).toContain("RESULTS_PROVIDER=football-data");
    expect(envExample).not.toContain("API_FOOTBALL_KEY=");
    expect(envExample).not.toContain("SPORTMONKS_API_TOKEN=");
    expect(envExample).not.toContain("TU_API_KEY");
  });
});
