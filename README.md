# Prode Mundial 2026

App web local para gestionar un Prode Mundial FIFA 2026 amistoso: fixture de grupos A-L, participantes, predicciones L/E/V, resultados reales via API-Football, ranking, podio, filtros y exportacion CSV.

No se muestran resultados inventados como reales. Si no hay API configurada, o si la API falla sin cache real, todos los partidos quedan pendientes.

## Instalacion

```bash
npm install
```

## Correr en local

```bash
npm run dev
```

Luego abrir la URL que informe Vite, normalmente `http://127.0.0.1:5173/`.

## Build

```bash
npm run build
```

## Tests y validacion

```bash
npm run test
npm run validate:data
```

`validate:data` verifica el dataset principal: 72 partidos, 6 por grupo, ids unicos, predicciones validas y resultados pendientes consistentes cuando no hay API.

## Providers de resultados

Por defecto la app intenta usar API-Football. Copiar `.env.example` a `.env.local` para configurar credenciales reales.

```env
VITE_RESULTS_PROVIDER=api-football
VITE_API_FOOTBALL_KEY=TU_API_KEY
VITE_API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
VITE_API_FOOTBALL_LEAGUE_ID=ID_DEL_MUNDIAL_2026
VITE_API_FOOTBALL_SEASON=2026
```

Valores soportados:

- `VITE_RESULTS_PROVIDER=api-football`: intenta resultados reales via API-Football.
- `VITE_RESULTS_PROVIDER=mock`: modo demo explicito; deja todos los partidos pendientes.

Fallback real:

1. API-Football.
2. Ultimo cache real.
3. Todos los partidos pendientes.

No se usa mock como fallback silencioso.

## Conectar API-Football

1. Crear una cuenta/API key de API-Football / API-Sports Football v3.
2. Crear `.env.local` basado en `.env.example`.
3. Completar `VITE_API_FOOTBALL_KEY`.
4. Completar `VITE_API_FOOTBALL_LEAGUE_ID` cuando este confirmado el id de la competicion FIFA 2026 en API-Football.
5. Si no sabes el league id, correr:

```bash
npm run discover:league
```

Ese script lee `.env.local`, consulta `/leagues?search=World Cup` y lista candidatas para la temporada configurada. No escribe secretos ni modifica archivos.

El fetch de resultados consulta:

```txt
GET /fixtures?league={VITE_API_FOOTBALL_LEAGUE_ID}&season={VITE_API_FOOTBALL_SEASON}
```

con header:

```txt
x-apisports-key: VITE_API_FOOTBALL_KEY
```

Si los nombres externos no alcanzan para mapear un partido, completar `src/data/apiFootballMatchMap.ts` con el `apiExternalId` real.

## Cache real

Cuando la API devuelve resultados reales, se guardan en `localStorage`:

- `prode:lastRealResults`
- `prode:lastRealResultsUpdatedAt`
- `prode:lastRealProvider`

El cache solo guarda respuestas de `api-football`. No guarda mock ni pending.

## Partidos pendientes

Si falta `VITE_API_FOOTBALL_KEY`, si falta configuracion, o si la API falla y no hay cache real, la app genera un resultado pendiente para cada partido:

- `status: "scheduled"`
- `homeGoals: null`
- `awayGoals: null`
- `outcome: null`

El ranking queda en 0 puntos hasta que existan resultados reales.

## Carga de participantes por CSV

La forma recomendada de cargar participantes es crear un archivo CSV por participante en:

```txt
data/prodes_csv/
```

Ejemplos:

```txt
data/prodes_csv/lucas.csv
data/prodes_csv/juan.csv
data/prodes_csv/maria.csv
```

Columnas obligatorias:

```csv
participant_id,participant_name,match_id,home_team,away_team,prediction
```

`prediction` acepta:

- `L`: gana el equipo izquierdo/local.
- `E`: empate.
- `V`: gana el equipo derecho/visitante.
- vacio: se convierte a `null` y figura como "sin marcar".

Para sincronizar CSV y generar `src/data/generatedParticipants.ts`:

```bash
npm run sync:participants
npm run dev
```

`npm run dev` y `npm run build` ejecutan la sincronizacion automaticamente antes de arrancar/compilar. Si modificas o agregas CSV mientras el dev server esta corriendo, reinicia el dev server o corre `npm run sync:participants` y recarga.

El loader ignora archivos `*.example.csv`, `*.sample.csv`, ocultos y temporales.

Para validar:

```bash
npm run validate:data
```

Si aparece un error de `match_id inexistente`, corregi la columna `match_id` para que use ids del fixture (`A1` a `L6`). Si `home_team` o `away_team` no coinciden con el fixture, se muestra un warning claro pero no se rompe la carga.

Regla de combinacion: si existen participantes generados desde CSV, se incluyen y reemplazan cualquier participante local con el mismo `id`. Los demos solo se muestran cuando no hay CSV o si se activa `SHOW_DEMO_PARTICIPANTS` en `src/data/getParticipants.ts`.

## Agregar participantes locales fallback

Editar `src/data/participants.ts` y sumar un objeto:

```ts
{
  id: "nuevo-id",
  name: "Nombre",
  predictions: {
    A1: "L",
    A2: "E",
    A3: "V",
    A4: null
  }
}
```

Las predicciones validas son `"L"`, `"E"`, `"V"` o `null`. Este archivo se mantiene como fallback si no hay CSV.

## Resultados mock

`src/data/mockResults.ts` ya no contiene partidos finalizados inventados. El mock visible solo deja todos los partidos pendientes. Los tests que necesitan resultados `finished` usan fixtures internos de test.

## L/E/V y scoring

- `L`: gana el equipo de la izquierda/local.
- `E`: empate.
- `V`: gana el equipo de la derecha/visitante.

Scoring:

- `finished` + acierto = 1 punto.
- `finished` + fallo = 0 puntos.
- `scheduled` = 0 puntos.
- `live` = 0 puntos.
- `null` = 0 puntos y figura como "sin marcar".

## Desempates

El ranking se ordena asi:

1. Mayor cantidad de puntos.
2. Mayor efectividad.
3. Menor cantidad de partidos sin marcar.
4. Orden alfabetico por nombre.

La UI tambien deja preparado el movimiento de ranking: subio, bajo o igual, calculado contra posiciones previas locales mockeadas en `src/data/participants.ts`.

## Exportar CSV

El boton "Exportar ranking CSV" descarga:

- `posicion`
- `participante`
- `puntos`
- `aciertos`
- `fallos`
- `pendientes`
- `sin_marcar`
- `efectividad`

No usa backend.

## Estructura principal

```txt
src/
  components/       UI reutilizable
  data/             fixture, participantes, generados CSV, resultados pending, mapa API
  services/         providers API/cache/pending
  types/            tipos del dominio
  utils/            scoring, ranking, validacion, CSV, formato, nombres
  __tests__/        tests unitarios y validacion de datos
```

## Proximos pasos recomendados

1. Crear `.env.local` con API key real.
2. Confirmar el `league id` de FIFA 2026 en API-Football o correr `npm run discover:league`.
3. Completar `src/data/apiFootballMatchMap.ts` con fixture ids reales si el mapeo por nombre no alcanza.
4. Convertir los prodes reales a CSV y copiarlos en `data/prodes_csv/`.
