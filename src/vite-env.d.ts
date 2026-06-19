/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESULTS_PROVIDER?: "mock" | "api-football";
  readonly VITE_API_FOOTBALL_KEY?: string;
  readonly VITE_API_FOOTBALL_BASE_URL?: string;
  readonly VITE_API_FOOTBALL_LEAGUE_ID?: string;
  readonly VITE_API_FOOTBALL_SEASON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
