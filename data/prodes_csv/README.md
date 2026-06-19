# CSV de participantes

Colocá en esta carpeta un archivo `.csv` por participante.

Columnas obligatorias:

```csv
participant_id,participant_name,match_id,home_team,away_team,prediction
```

`prediction` acepta `L`, `E`, `V` o vacío. Un valor vacío se convierte en `null`.

El script `npm run sync:participants` lee todos los `.csv` de esta carpeta y genera `src/data/generatedParticipants.ts`.

Si copiás `lucas.example.csv` para crear otro participante, cambiá `participant_id` y `participant_name`. Si dejás dos archivos con el mismo `participant_id`, la validación falla para evitar duplicados.
