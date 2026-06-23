import express from "express";
import { loadEnvLocal } from "./utils/env";
import { getResultsResponse } from "./resultsPipeline";
import { getResultsCacheTtlSeconds } from "./utils/resultsCache";
import { buildResultsMeta } from "./utils/resultsMeta";

loadEnvLocal();

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use((_request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/results", async (_request, response) => {
  try {
    const forceRefresh = _request.query.refresh === "true";
    const payload = await getResultsResponse({ forceRefresh });
    response.json(payload);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    const results = [];
    response.status(500).json({
      source: "pending",
      status: "error",
      message: "Error interno del backend local.",
      updatedAt: new Date().toISOString(),
      results,
      meta: buildResultsMeta({
        source: "pending",
        results,
        cacheHit: false,
        cacheAgeSeconds: null,
        cacheTtlSeconds: getResultsCacheTtlSeconds(),
        fetchedFromProvider: false
      })
    });
  }
});

app.listen(port, () => {
  console.log(`Backend local listo en http://localhost:${port}`);
});
