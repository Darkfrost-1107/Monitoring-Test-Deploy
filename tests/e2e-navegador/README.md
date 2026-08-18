# Suite e2e de navegador

Recorridos de extremo a extremo por navegador (Playwright) que ejercitan
**funciones reales de cada actor** y verifican el efecto en la base de datos, no
sólo que la pantalla cargue.

Corre contra un **stack aislado** (Postgres efímera `:5433`, backend `:3001`,
frontend `:5174`). Nunca toca la base de desarrollo (`:5432` / `:3000` / `:5173`):
una suite que inicia sesión, crea cronogramas y finaliza fichas **muta datos**, y
esos efectos no deben caer sobre la base de trabajo.

## Requisitos

- Docker (para la Postgres efímera).
- El navegador de Playwright cacheado en `~/.cache/ms-playwright/chromium-*`
  (se instala con `pnpm dlx playwright install chromium`), o exportar
  `PLAYWRIGHT_CHROMIUM=/ruta/al/chrome`.
- `npm install` dentro de esta carpeta (trae `playwright-core`).

## Uso

```bash
cd tests/e2e-navegador
npm install
./stack-up.sh      # levanta DB efímera + backend + frontend aislados
npm test           # corre las 6 jornadas y escribe results.json
./stack-down.sh    # baja todo
```

Variables opcionales: `E2E_API`, `E2E_WEB`, `E2E_DB_CONTAINER`, `E2E_DB_NAME`,
`E2E_PASSWORD`, `PLAYWRIGHT_CHROMIUM`.

## Jornadas

| ID | Actor | Qué ejercita | Verificación en BD |
|----|-------|--------------|--------------------|
| J1 | Los 8 roles | primer login → cambio de contraseña → aterrizaje | 8/8 sin quedar en /login |
| J2 | Jefe de Gestión | registrar un cronograma (form en cascada) | `cronogramas` +1 |
| J3 | Especialista | llenar la rúbrica y **finalizar** una ficha | visita → `COMPLETADO`, `fichas_monitoreo` +1 |
| J4 | Especialista | registrar firma y **firmar** la ficha | `ficha_firmas` ≥ 1 |
| J5 | Director de I.E. | asignar un **Coordinador Pedagógico** | rol creado (≥1) |
| J6 | Director de I.E. | asignar un **Jefe de Taller** | rol creado (≥1) |

Coordinador y Jefe de Taller no los crea ningún seed: J5/J6 los generan desde la
app, y J1 los incluye después.

## Notas

- Credenciales del seed: la contraseña inicial de cada usuario **es su DNI**, y
  todos arrancan en primer-login. `lib.mjs` los pasa a la contraseña definitiva
  (`PruebaE2E2026`) por API antes de manejar el navegador.
- Las capturas de cada jornada quedan en `capturas/`.
- Los recorridos descubren sus datos objetivo por SQL (visita EN_PROCESO, ficha
  sin firmar, director de Secundaria), así que sobreviven a un re-seed.
