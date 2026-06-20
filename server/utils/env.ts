import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnvLocal(projectRoot = process.cwd()): void {
  const envPath = join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;

  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}
