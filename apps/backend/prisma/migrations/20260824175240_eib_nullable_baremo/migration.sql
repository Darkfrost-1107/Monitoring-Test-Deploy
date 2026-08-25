-- El monitoreo EIB es informativo: no produce puntaje, promedio ni nivel de logro.
-- Estas columnas pasan a admitir NULL para reflejarlo en la ficha.
ALTER TABLE "fichas_monitoreo"
  ALTER COLUMN "puntaje_total" DROP NOT NULL,
  ALTER COLUMN "promedio" DROP NOT NULL,
  ALTER COLUMN "nivel_logro" DROP NOT NULL;
