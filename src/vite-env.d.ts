/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESULTS_PROVIDER?: "auto" | "mock" | "api-football" | "sportmonks" | "manual-real";
  readonly VITE_API_FOOTBALL_KEY?: string;
  readonly VITE_API_FOOTBALL_BASE_URL?: string;
  readonly VITE_API_FOOTBALL_LEAGUE_ID?: string;
  readonly VITE_API_FOOTBALL_SEASON?: string;
  readonly VITE_SPORTMONKS_API_TOKEN?: string;
  readonly VITE_SPORTMONKS_BASE_URL?: string;
  readonly VITE_SPORTMONKS_WORLD_CUP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
