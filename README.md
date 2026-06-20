# Prode Mundial 2026

App local para gestionar un Prode Mundial FIFA 2026 amistoso con React/Vite y un backend local Node/Express para consultar resultados reales sin exponer tokens en el navegador.

## Arquitectura

```txt
Frontend React/Vite
  -> Backend local http://localhost:8787/api/results
  -> API-Football / Sportmonks / CSV real / Pending
```

El frontend no llama API-Football ni Sportmonks directamente. Las claves privadas se leen solo en el backend desde `.env.local`.

## Instalacion

```bash
npm install
```

## Variables .env.local

Crear `.env.local` en la raiz:

```env
# Frontend publica
VITE_RESULTS_API_URL=http://localhost:8787/api/results

# API-Football privada, usada solo por backend local
API_FOOTBALL_KEY=
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026

# Sportmonks privada, usada solo por backend local
SPORTMONKS_API_TOKEN=
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football
SPORTMONKS_WORLD_CUP_ID=26618

# Provider backend
RESULTS_PROVIDER=auto
```

`.env.local` esta ignorado por Git. No uses `VITE_` para tokens privados.

## Correr

```bash
npm run dev
```

Ese comando levanta:

- backend: `http://localhost:8787`
- frontend: `http://127.0.0.1:5173`

Tambien se pueden correr por separado:

```bash
npm run dev:server
npm run dev:client
```

## Probar backend

```txt
http://localhost:8787/api/health
http://localhost:8787/api/results
```

`/api/results` devuelve:

```json
{
  "source": "api-football",
  "status": "ok",
  "message": "Resultados reales via API-Football.",
  "updatedAt": "2026-06-20T00:00:00.000Z",
  "results": []
}
```

## Fallback de resultados

Orden del backend:

1. API-Football
2. Sportmonks
3. Cache real en `data/cache/results-cache.json`
4. CSV manual real
5. Pending results

API-Football puede reconocer `league=1` World Cup y `season=2026` pero devolver `results=0`. En ese caso no se considera exito y se prueba Sportmonks.

No se usan resultados inventados.

## Sportmonks

Configurar:

```env
SPORTMONKS_API_TOKEN=
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football
SPORTMONKS_WORLD_CUP_ID=26618
```

El backend consulta fixtures con:

```txt
GET /fixtures?filters=fixtureLeagues:{SPORTMONKS_WORLD_CUP_ID}&include=participants;state;scores;league;season
```

Para buscar candidatas:

```bash
npm run discover:sportmonks
```

El script no imprime tokens.

## API-Football

Configurar:

```env
API_FOOTBALL_KEY=
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
API_FOOTBALL_LEAGUE_ID=1
API_FOOTBALL_SEASON=2026
```

Para listar ligas candidatas:

```bash
npm run discover:league
```

## Resultados reales por CSV

Si las APIs no tienen datos, cargar CSV real en:

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
npm run server
```

## Scoring

- `finished` + acierto = 1 punto.
- `finished` + fallo = 0 puntos.
- `scheduled` = 0 puntos.
- `live` = 0 puntos.
- prediccion `null` = 0 puntos y figura como sin marcar.

## Estructura

```txt
server/              backend local Express y providers privados
src/                 frontend React/Vite
data/prodes_csv/     participantes CSV
data/results_csv/    resultados reales CSV
data/cache/          cache real local ignorado por Git
```
