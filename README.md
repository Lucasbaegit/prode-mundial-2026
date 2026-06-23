# Prode Mundial 2026

App local para gestionar un Prode Mundial FIFA 2026 con React/Vite y un backend local Node/Express. El backend consulta resultados reales sin exponer tokens en el navegador.

## Arquitectura

```txt
Frontend React/Vite
  -> Backend local http://localhost:8787/api/results
  -> football-data.org
  -> Cache real
  -> CSV real
  -> Pending
```

El frontend solo llama al backend local. `FOOTBALL_DATA_API_TOKEN` se lee desde `.env.local` en Node, nunca como variable `VITE_*`.

## Instalacion

```bash
npm install
```

## Variables .env.local

Crear `.env.local` en la raiz:

```env
VITE_RESULTS_API_URL=http://localhost:8787/api/results

RESULTS_PROVIDER=football-data
RESULTS_CACHE_TTL_SECONDS=600

FOOTBALL_DATA_API_TOKEN=TU_TOKEN_REAL
FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
FOOTBALL_DATA_COMPETITION_CODE=WC
FOOTBALL_DATA_DATE_FROM=2026-06-11
FOOTBALL_DATA_DATE_TO=2026-06-28
FOOTBALL_DATA_DATE_WINDOWS=2026-06-11:2026-06-15,2026-06-16:2026-06-20,2026-06-21:2026-06-24,2026-06-25:2026-06-28
```

Para conseguir token, crear una cuenta en football-data.org y copiar el API token personal. `.env.local` esta ignorado por Git.

## Pipeline de resultados

Orden activo del backend:

1. football-data.org
2. Cache real en `data/cache/results-cache.json`
3. CSV real en `data/results_csv/`
4. Pending results

No se usan resultados inventados. API-Football y Sportmonks quedaron fuera del flujo activo porque API-Football devolvia 0 fixtures para World Cup 2026 y Sportmonks no estaba disponible/sin token util en esta etapa.

## Cache TTL

El backend guarda cache real en `data/cache/results-cache.json` cuando la fuente es `football-data.org` o CSV real. Por defecto:

```env
RESULTS_CACHE_TTL_SECONDS=600
```

Mientras la cache tenga menos de ese TTL, `GET /api/results` responde desde cache sin consultar football-data.org. Esto evita gastar requests al abrir la app o refrescar la pagina muchas veces.

El boton "Actualizar resultados reales" llama:

```txt
GET /api/results?refresh=true
```

Ese refresh ignora el TTL y consulta football-data.org. Si la API falla y hay cache vencida, el backend usa esa cache como fallback e informa `cacheAgeSeconds`, `cacheTtlSeconds`, `cacheHit` y `fetchedFromProvider` en `meta`.

`/api/results` incluye metadata para la UI:

```json
{
  "meta": {
    "totalMatches": 72,
    "realResultsCount": 53,
    "pendingWithoutRealDataCount": 19,
    "provider": "football-data",
    "cacheHit": false,
    "cacheAgeSeconds": null,
    "cacheTtlSeconds": 600,
    "fetchedFromProvider": true
  }
}
```

## football-data.org

El provider intenta primero una sola request con rango completo:

```txt
GET /matches?dateFrom=2026-06-11&dateTo=2026-06-28
Header: X-Auth-Token: FOOTBALL_DATA_API_TOKEN
```

Si el rango completo falla por permisos, limites o error controlado, prueba ventanas de fechas. Por defecto:

```txt
2026-06-11:2026-06-15
2026-06-16:2026-06-20
2026-06-21:2026-06-24
2026-06-25:2026-06-28
```

Las ventanas se pueden configurar con:

```env
FOOTBALL_DATA_DATE_WINDOWS=2026-06-11:2026-06-15,2026-06-16:2026-06-20,2026-06-21:2026-06-24,2026-06-25:2026-06-28
```

El limite esperado por actualizacion manual es 1 request si el rango completo funciona, o hasta 5 requests si el rango falla y se usan 4 ventanas. Si una ventana responde `429`, se cortan las ventanas restantes para cuidar el rate limit. Solo si no hay rate limit y no se obtuvo nada util, prueba `/matches` sin rango como fallback, que puede traer solo partidos del dia/current.

Despues de juntar respuestas, deduplica por id externo de football-data, filtra estrictamente contra los 72 partidos locales A1-L6 por nombres normalizados y descarta competiciones ajenas.

Para descubrir coincidencias:

```bash
npm run discover:football-data
```

El discovery imprime estrategia usada, ventanas OK, total externo devuelto, total coincidente, primeros 20 partidos locales detectados, status y goles. No imprime tokens.

## Correr

```bash
npm run dev
```

Ese comando levanta:

- backend: `http://localhost:8787`
- frontend Vite: `http://127.0.0.1:5175`

Probar backend:

```txt
http://localhost:8787/api/health
http://localhost:8787/api/results
http://localhost:8787/api/results?refresh=true
```

## Resultados reales por CSV

Si football-data.org no tiene datos o no hay token, cargar CSV real en:

```txt
data/results_csv/
```

Formato:

```csv
match_id,home_goals,away_goals,status,updated_at
A1,2,0,finished,2026-06-11T20:00:00Z
```

Sincronizar:

```bash
npm run sync:results
```

Los archivos `*.example.csv`, `*.sample.csv`, ocultos o temporales se ignoran.

## Participantes por CSV

Crear un CSV por participante en:

```txt
data/prodes_csv/
```

Formato:

```csv
participant_id,participant_name,match_id,home_team,away_team,prediction
```

`prediction` acepta `L`, `E`, `V` o vacio. Sincronizar:

```bash
npm run sync:participants
```

## Scripts

```bash
npm run sync:participants
npm run sync:results
npm run validate:data
npm run test
npm run build
npm run discover:football-data
npm run dev
```

## Scoring

- `finished` + acierto = 1 punto.
- `finished` + fallo = 0 puntos.
- `scheduled` = 0 puntos.
- `live` = 0 puntos.
- prediccion `null` = 0 puntos y figura como sin marcar.
