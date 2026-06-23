import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("App refresh UX", () => {
  it("el boton actualizar fuerza refresh=true", () => {
    const appSource = readFileSync("src/App.tsx", "utf8");

    expect(appSource).toContain("onRefresh={() => refreshResults(true)}");
  });
});
