# Prode Mundial 2026

App web local para gestionar un Prode Mundial FIFA 2026 amistoso: fixture de grupos A-L, participantes, predicciones L/E/V, resultados mock o API-Football, ranking, podio, filtros y exportación CSV.

## Instalación

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

## Tests y validación

```bash
npm run test
npm run validate:data
```

`validate:data` verifica el dataset principal: 72 partidos, 6 por grupo, ids únicos, predicciones válidas, Lucas con 72 entradas y resultados mock consistentes.

## Providers de resultados

Por defecto la app usa mock local. Copiar `.env.example` a `.env.local` si se quiere cambiar provider.

```env
VITE_RESULTS_PROVIDER=mock
VITE_API_FOOTBALL_KEY=
VITE_API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
VITE_API_FOOTBALL_LEAGUE_ID=
VITE_API_FOOTBALL_SEASON=2026
```

Valores soportados:

- `VITE_RESULTS_PROVIDER=mock`: usa `src/data/mockResults.ts`.
- `VITE_RESULTS_PROVIDER=api-football`: intenta API-Football si hay API key y league id.

Si la API falla por credenciales, red, CORS, cuota o falta de configuración, la app usa cache local si existe. Si no hay cache, cae a mock local. Nunca se necesita internet para que la app funcione en modo mock.

## Conectar API-Football

1. Crear una cuenta/API key de API-Football / API-Sports Football v3.
2. Crear `.env.local` basado en `.env.example`.
3. Completar `VITE_API_FOOTBALL_KEY`.
4. Completar `VITE_API_FOOTBALL_LEAGUE_ID` cuando esté confirmado el id de la competición FIFA 2026 en API-Football.
5. Revisar `src/data/apiFootballMatchMap.ts` para mapear `matchId` local contra `apiExternalId` real si la comparación por nombres no alcanza.

El fetch implementado consulta:

```txt
GET /fixtures?league={VITE_API_FOOTBALL_LEAGUE_ID}&season={VITE_API_FOOTBALL_SEASON}
```

con header:

```txt
x-apisports-key: VITE_API_FOOTBALL_KEY
```

## Cache local

Cuando la API devuelve resultados válidos, se guardan en `localStorage`:

- últimos resultados descargados;
- fecha de actualización;
- provider usado.

Si la API no está disponible, el fallback es: API-Football -> cache local -> mock local.

## Agregar participantes

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

Las predicciones válidas son `"L"`, `"E"`, `"V"` o `null`. Los partidos sin entrada se tratan como `null` al calcular, pero Lucas se valida con las 72 entradas explícitas.

## Agregar o actualizar resultados mock

Editar `src/data/mockResults.ts`. Los estados válidos son:

- `scheduled`;
- `live`;
- `finished`.

Solo los partidos `finished` con predicción correcta suman puntos.

## L/E/V y scoring

- `L`: gana el equipo de la izquierda/local.
- `E`: empate.
- `V`: gana el equipo de la derecha/visitante.

Scoring:

- `finished` + acierto = 1 punto.
- `finished` + fallo = 0 puntos.
- `scheduled` = 0 puntos.
- `live` = 0 puntos.
- `null` = 0 puntos y figura como “sin marcar”.

## Desempates

El ranking se ordena así:

1. Mayor cantidad de puntos.
2. Mayor efectividad.
3. Menor cantidad de partidos sin marcar.
4. Orden alfabético por nombre.

La UI también deja preparado el movimiento de ranking: subió, bajó o igual, calculado contra posiciones previas locales mockeadas en `src/data/participants.ts`.

## Exportar CSV

El botón “Exportar ranking CSV” descarga:

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
  data/             fixture, participantes, resultados mock, mapa API
  services/         providers mock/cache/API y fallback
  types/            tipos del dominio
  utils/            scoring, ranking, validación, CSV, formato, nombres
  __tests__/        tests unitarios y validación de datos
```

## Próximos pasos recomendados

1. Cargar más participantes reales en `src/data/participants.ts`.
2. Confirmar el `league id` de FIFA 2026 en API-Football.
3. Completar `src/data/apiFootballMatchMap.ts` con fixture ids reales.
4. Agregar persistencia backend cuando haya edición multiusuario o historial real de movimientos.
