import type { ActualResult, ResultProviderName, ResultsMeta } from "../src/types/prode";

export type ServerResultsSource = Exclude<ResultProviderName, "mock">;

export interface ServerResultsResponse {
  source: ServerResultsSource;
  status: "ok" | "no-data" | "error";
  message: string;
  updatedAt: string;
  results: ActualResult[];
  meta: ResultsMeta;
}

export interface ServerProviderResult {
  source: Exclude<ServerResultsSource, "cache" | "pending">;
  message: string;
  results: ActualResult[];
}
