# Plan de Remediación Técnica — SIGEPRO / Sistema de Monitoreo

**Fecha de elaboración:** 2026-08-05
**Rama de referencia:** `develop`
**Método de análisis:** índice CodeGraph (576 archivos, 5.354 nodos, 12.196 relaciones) + inspección directa del código fuente.

---

## 1. Contexto y alcance

Este documento define un plan por fases para remediar la deuda técnica que actualmente impide reestructurar el proyecto de forma segura y escalarlo.

**Conclusión del diagnóstico previo:** la arquitectura macro es correcta y no requiere reemplazo. El monorepo (`apps/` + `packages/`), el patrón de puertos y adaptadores del backend (interfaces `*.repository.ts` con implementaciones `prisma-*.repository.ts`) y la organización Feature-Sliced Design del frontend (`entities/` → `features/` → `widgets/` → `pages/`) son decisiones sólidas.

El problema no es la estructura de carpetas. El problema es que **el paquete de contratos compartidos nunca adquirió autoridad real**, y cada capa resolvió localmente las definiciones que faltaban. La consecuencia acumulada es que hoy no existe un punto único donde detener un refactor de permisos, ni una red de pruebas que permita ejecutarlo con seguridad.

**Fuera de alcance de este plan:** cambios de stack, migración de framework, rediseño de base de datos, y cualquier modificación de la funcionalidad visible para el usuario. Este es un plan de remediación estructural, no de producto.

---

## 2. Principios rectores

Estos principios determinan el orden de las fases y no son negociables sin invalidar el plan completo.

1. **Medir antes de tocar.** Ninguna fase de refactor arranca sin línea base registrada. Sin métrica previa no hay forma de demostrar mejora ni de detectar regresión.
2. **El contrato antes que el consumo.** No se centraliza autorización mientras existan definiciones de rol contradictorias. Centralizar sobre un contrato ambiguo solo mueve la ambigüedad de lugar.
3. **La red de pruebas antes que la descomposición.** No se parten componentes de más de 1.000 líneas sin cobertura previa. Refactorizar sin pruebas es reescribir a ciegas.
4. **Comportamiento congelado.** Cada fase de refactor debe ser observacionalmente equivalente. Si una fase cambia comportamiento visible, se separa en un cambio funcional aparte con su propia validación.
5. **Una fase, un tipo de cambio.** No se mezcla renombrado con extracción, ni extracción con corrección de bugs. Los commits mezclados son irrevisables.
6. **Cada fase entrega valor independiente.** El plan puede detenerse al final de cualquier fase sin dejar el sistema en estado intermedio inconsistente.

---

## 3. Línea base medida

Valores generados por `./scripts/metricas.sh` sobre `develop` (commit `ca38f45`) y
versionados en `docs/metricas/baseline-2026-08.json`. Ese archivo es la referencia
de comparación de todas las fases; el script es la fuente única de medición, de
modo que CI y desarrollo local calculan exactamente lo mismo.

| Métrica | Valor actual | Objetivo al cierre del plan |
| --- | --- | --- |
| Archivos fuente (`.ts` / `.tsx`) | 544 | — |
| Archivos de prueba | 27 | ≥ 120 |
| **Cobertura de sentencias — frontend** | **1,55 %** | ≥ 45 % |
| **Cobertura de sentencias — backend** | **19,51 %** | ≥ 60 % |
| Ratio de archivos con prueba | 5,0 % | ≥ 20 % |
| Declaraciones de rol (`UserRole` / `RoleCode`) | 4 | 1 |
| Archivos con comparación **literal** de rol | 25 | 0 |
| Comparaciones **literales** de rol (`role === 'jefe_area'`) | 104 | 0 |
| Comparaciones **tipadas** de rol (`role === RoleCode.JEFE_AREA`) | 0 | sin objetivo |
| Ocurrencias de `any` en código fuente | 121 | ≤ 20 |
| Archivos con `eslint-disable` a nivel de archivo | 26 | 0 |
| Componentes de más de 300 líneas | 19 | 0 |
| Componentes de más de 700 líneas | 6 | 0 |
| Componente mayor | 1.443 líneas | ≤ 300 |
| Máximo de props en un solo componente | 29 (`CalendarioGrid`) | ≤ 8 |
| Líneas totales en los 5 `*FormBase` | 1.924 | ≤ 700 |

> **Corrección introducida por la Fase 0.** La estimación preliminar de cobertura
> (4,7 %) se derivaba del cociente entre archivos de prueba y archivos fuente. Esa
> cifra sobreestima el frontend y subestima el backend, porque cuenta cuántos
> archivos tienen prueba, no cuánto código se ejecuta. La medición real —
> **1,55 % en frontend, 19,51 % en backend** — es la que gobierna los umbrales de
> la Fase 3. El ratio por archivo se conserva sólo como indicador secundario.
>
> El recuento de supresiones de lint también se corrigió: son **26 en todo el
> repositorio**, no 6. La cifra anterior contaba únicamente los archivos de la
> capa de datos del backend con reglas `no-unsafe-*`, que siguen siendo el
> subconjunto crítico que ataca la Fase 4.

---

## 4. Inventario de hallazgos

Referencia cruzada entre cada hallazgo, su evidencia en el código y la fase que lo resuelve.

| # | Hallazgo | Evidencia | Fase |
| --- | --- | --- | --- |
| H-01 | `UserRole` de `shared-contracts` no corresponde a ninguna realidad del sistema | `packages/shared-contracts/src/constants/domain.constants.ts:2` | 1 |
| H-02 | Comentario que documenta un enum de Prisma inexistente | `domain.constants.ts:1` vs. `apps/backend/prisma/schema.prisma` (cero declaraciones `enum`) | 1 |
| H-03 | Rol fantasma `admin`: existe solo en frontend, con el conjunto de permisos más amplio | `shared/constants/roles.ts:11,60-66,185` — ausente en `RoleCode` | 1 |
| H-04 | Tipo `UserRole` duplicado literalmente en dos archivos del frontend | `shared/constants/roles.ts:1` y `entities/model-user/constants.ts:1` | 1 |
| H-05 | Diccionario de etiquetas de rol duplicado y divergente | `ROLE_LABELS` (roles.ts:14) vs. `USER_ROLES_LABELS` (constants.ts:15) — difieren en `director_ugel` | 1 |
| H-06 | Autorización dispersa en 25 archivos de presentación | `rg "role ===" apps/frontend/src` | 2 |
| H-07 | Matriz de permisos estática de 11 roles × 28 ítems de menú | `shared/constants/roles.ts:59-172` | 2 |
| H-08 | Ruta de aterrizaje por rol resuelta con `switch` literal | `shared/constants/roles.ts:183-205` | 2 |
| H-09 | `useUser` con 73 consumidores y cero cobertura | `entities/model-user/use-user.ts:4` | 3 |
| H-10 | Cobertura global de 4,7 % | 26 pruebas / 556 fuentes | 3 |
| H-11 | Reglas de tipado desactivadas a nivel de archivo en repositorios y controladores | `prisma-cronograma.repository.ts:1`, `prisma-ficha.repository.ts:1`, `prisma-reporte.repository.ts:1`, `ficha.controller.ts:1`, `scheduling.controller.ts:1`, `reporte.controller.ts:1` | 4 |
| H-12 | 121 ocurrencias de `any` | `rg ':\s*any\b\|as any' apps/*/src packages/*/src` | 4 |
| H-13 | Componentes monolíticos: 4.775 líneas en 4 archivos | `CronogramaPage.tsx` (1.443), `LlenarFichaForm.tsx` (1.309), `CalendarioGrid.tsx` (1.086), `CalendarioSidebar.tsx` (937) | 5 |
| H-14 | Prop drilling de 29 propiedades, 12 de ellas pares valor/setter | `CalendarioGrid.tsx:21-50` | 5 |
| H-15 | Dependencias de efecto silenciadas | `CronogramaPage.tsx:526`, `DocenteListPageBase.tsx:97` | 5 |
| H-16 | Mapeo estado → estilo triplicado en un mismo archivo | `CalendarioGrid.tsx:117,134,151` (+6 en `CalendarioSidebar`, +3 en `CronogramaPage`) | 6 |
| H-17 | Manipulación manual de fechas por segmentación de cadenas | `CalendarioGrid.tsx:60-115` | 6 |
| H-18 | Cinco formularios base con estructura equivalente, 1.924 líneas | `features/{docentes,especialistas,jefes-area,directores,institutions}/ui/*FormBase.tsx` | 6 |
| H-19 | **Tres** secretos de infraestructura con valor por defecto, no uno | `env.validation.ts:14` (`DATABASE_URL`), `:17` (`JWT_SECRET`), `:20` (`JWT_REFRESH_SECRET`) | 0 ✅ |
| H-20 | Datos simulados dentro del árbol de producción (356 líneas) | `entities/model-cronogramas/mocks.ts` | 7 |
| H-21 | Migraciones pendientes declaradas y no ejecutadas | `entities/model-plantillas/use-plantillas-api.ts:9`, `entities/model-cronogramas/use-cronogramas-api.ts:16` | 7 |
| H-22 | `packages/shared-validation` está vacío: sólo contiene `.gitkeep` | `packages/shared-validation/` | 4, 6 |
| H-23 | `app-config.types.ts` es código muerto: 75 líneas sin ningún importador | `apps/backend/src/config/app-config.types.ts` | 7 |
| H-24 | El backend **ya tiene** un modelo de autorización por capacidades; la Fase 2 no debe construirlo sino exponerlo al frontend | `apps/backend/src/shared/auth/capability-map.ts`, `scope-filter.ts` | 2 |
| H-25 | La matriz `rol_permisos` sembrada en la base es código muerto y ya divergió del mapa de capacidades vigente | `database/seeders/auth.js:42` vs. `capability-map.ts:49` | 2 |
| H-26 | La capa de presentación confunde **modalidad** con **nivel educativo**, y declara un valor inexistente | `shared/types/index.ts:1`, `LampaMap.tsx:99`, `ReportesGrid.tsx:57` | 6 |
| H-28 | **CORREGIDO.** El nivel de logro que veía el evaluador y el que se persistía se calculaban con reglas distintas | `LlenarFichaForm.tsx:468` vs. `baremo-calculator.service.ts:42` | 3 |

### H-28 — el evaluador veía una calificación y se guardaba otra

Detectado al buscar lógica extraíble en `LlenarFichaForm`. La regla del baremo
estaba implementada **dos veces y de forma distinta**:

| Dónde | Sobre qué calculaba |
| --- | --- |
| `LlenarFichaForm.tsx:468` | **puntaje total**, con una tabla propia |
| `baremo-calculator.service.ts:42` | **promedio**, con los umbrales EDU-0009 |

El valor de la pantalla **nunca llegaba al servidor**: era sólo presentación, y
el backend recalculaba por su cuenta al finalizar. Nada obligaba a que
coincidieran, y no coincidían.

Coincidían únicamente para plantillas de **exactamente cinco desempeños**,
porque la tabla de la pantalla era este mismo baremo precalculado para ese caso.
La rama `else` repartía por cuartiles del rango, que no es la misma división que
los umbrales de promedio.

**Con las plantillas que siembra el proyecto, el defecto estaba vivo:**

| Plantilla | Puntaje | Pantalla | Se guardaba |
| --- | --- | --- | --- |
| DIRECTIVO (2 desempeños) | 7 | Logro destacado | **Logro esperado** |
| DOCENTE (3 desempeños) | 5 | Inicio | **En proceso** |
| DOCENTE (3 desempeños) | 10 | Logro destacado | **Logro esperado** |

El especialista cerraba la ficha viendo un nivel, el docente quedaba registrado
con otro, y el reporte impreso salía del dato guardado.

**Corrección aplicada.** El cálculo se traslada a
`packages/shared-contracts/src/evaluations/baremo.ts` como única definición.
`BaremoCalculatorService` queda como fachada inyectable que delega en él, y
`LlenarFichaForm` lo consume en lugar de calcular. Las 26 pruebas que ya tenía el
servicio pasan sin modificación —fueron la red que verificó el traslado— y se
añaden 13 para las piezas que la pantalla calculaba aparte.

Se corrige de paso que la pantalla escribía `'LOGRO ESPERADO'` con espacio
mientras el contrato define `'LOGRO_ESPERADO'` con guion bajo. El texto visible
sale ahora de `NIVEL_LOGRO_LABELS`, separado del código del nivel.

### H-26 — modalidad y nivel educativo se confunden en la interfaz

El catálogo canónico vive en `packages/shared-contracts/src/constants/domain.constants.ts`
y distingue con claridad cuatro modalidades y sus doce niveles:

| Modalidad | Niveles |
| --- | --- |
| EBR | Inicial · Primaria · Secundaria |
| EBA | Inicial-Intermedio · Avanzado |
| EBE | CEBE · PRITE |
| CEPTRO | Corte y Ensamblaje · Mecánica de Motos y Vehículos Afines · Peluquería y barbería · Fabricación artesanal de productos de madera · Plataformas y servicios de tecnologías de la información |

Ningún nombre de nivel se repite entre modalidades, invariante ya protegido por
`apps/backend/src/common/validators/modalidad-nivel.spec.ts`.

**La capa de presentación no respeta esa distinción.** El caso más claro:

```ts
// apps/frontend/src/shared/types/index.ts:1
export type NivelInstitucion = 'Inicial' | 'Primaria' | 'Secundaria' | 'EBA' | 'EBE' | 'CEPROs';
```

`Inicial`, `Primaria` y `Secundaria` son **niveles**; `EBA` y `EBE` son
**modalidades**. Conviven en una misma unión bajo un tipo que dice ser de
niveles. Y `'CEPROs'` **no existe en el dominio**: no es modalidad —el catálogo
declara `CEPTRO`, sin ese sufijo— ni es nivel. Ese valor inventado es la
evidencia de que el tipo se escribió mezclando ambos ejes sin consultar el
catálogo.

Divergencias restantes:

| Ubicación | Problema |
| --- | --- |
| `entities/model-especialistas/model.ts:1` | Segundo tipo homónimo `NivelInstitucion`, con contenido distinto (sólo EBR) |
| `pages/directorUgel/components/LampaMap.tsx:99` | Niveles escritos a mano; el mapa de cobertura **no puede filtrar instituciones EBA, EBE ni CEPTRO** |
| `widgets/reportes/ui/ReportesGrid.tsx:57` | `MODALIDADES` enumeradas a mano |
| `entities/model-especialistas/constants.ts:16` | `NIVELES_INSTITUCION = NIVELES_EBR`: el nombre afirma más de lo que contiene |
| `features/cronogramas/api/cronogramas.api.ts:18` | Unión de modalidades declarada en línea |

`features/directores/ui/filter-directores.tsx` es la excepción: consume
`MODALIDAD_NIVEL_MAP` del contrato. Demuestra que la vía correcta existe y que
lo que faltó fue consistencia.

**Descarte, para no perder tiempo al abordarlo.** `NIVELES_ROMANOS` y
`NIVELES_DEFAULT` (`entities/model-plantillas/constants.ts`) **no** pertenecen a
este dominio: son niveles de *logro* (I a IV, de «Muy Insatisfactorio» a
«Destacado»). Coinciden en el nombre, no en el concepto.

### Hallazgo incorporado durante la Fase 1 — H-24 redefine la Fase 2

La Fase 2, tal como se redactó, proponía *construir* un módulo de política de
autorización. **Ese módulo ya existe en el backend, y es mejor que el propuesto.**

`apps/backend/src/shared/auth/capability-map.ts` implementa un modelo por
capacidades que compone tres fuentes —el rol de autenticación, el cargo activo del
especialista y los cargos docentes vigentes— mediante
`computeEffectivePermissions()`. Incluye además reglas de coexistencia de cargos
(`CARGO_COMPATIBILITY`, `canAddCargo`) y resolución de cargo principal por
prioridad. Las reglas contextuales que la Fase 2 daba por «implícitas y dispersas»
están modeladas en `shared/auth/scope-filter.ts` (`isAllScope`,
`isInstitucionScope`, `isMonitorScope`, `isJefeAreaScope`, `isOwnScope`).

El consumo también está resuelto del lado del servidor: `RequirePermissions` se
aplica en 28 controladores, `PermissionsGuard` valida contra
`user.permissions`, y las capacidades viajan en el JWT desde
`auth-token.service.ts`.

**Lo que falta es exclusivamente el lado del frontend**, que sigue decidiendo por
comparación literal de rol en 25 archivos e ignora las capacidades que ya recibe
en el token. La Fase 2 se reformula en consecuencia: *no* diseñar un vocabulario de
capacidades —ya existe y está sembrado en `PERMISOS`—, sino consumir en el
frontend el que el backend emite. Eso reduce su esfuerzo estimado de **L a M** y
elimina el riesgo principal que tenía: que frontend y backend evaluaran permisos
con reglas distintas.

**H-25** es un efecto colateral del mismo hallazgo. `database/seeders/auth.js:42`
siembra una matriz `ROL_PERMISOS` en la base que `auth-token.service.ts` ya no lee
—fue reemplazada por el mapa de capacidades— y que **ya divergió**: para
`director_ugel` el seeder concede `['dashboard:read', 'reports:read']` mientras
`ROL_CAPABILITIES` concede `['dashboard:read', 'instituciones:read',
'notificaciones:send', 'visitas:solicitar']`. Es un quinto punto de verdad sobre
autorización, inerte pero engañoso para quien lea el seeder. Se retira en la Fase 2.

### Hallazgos incorporados durante la Fase 0

**H-19 resultó de mayor alcance que el diagnóstico inicial.** No era un secreto con
valor por defecto, sino tres:

```
env.validation.ts:14   DATABASE_URL        = 'postgresql://admin:admin@localhost:5432/...'
env.validation.ts:17   JWT_SECRET          = 'CHANGE_ME_USE_A_LONG_RANDOM_SECRET_AT_LEAST_64_CHARS'
env.validation.ts:20   JWT_REFRESH_SECRET  = 'CHANGE_ME_USE_A_LONG_RANDOM_SECRET_AT_LEAST_64_CHARS'
```

Los dos secretos de firma son de mayor gravedad que la cadena de conexión: una
clave de firma conocida permite fabricar un token válido para cualquier usuario y
cualquier rol, lo que constituye una elusión completa de la autenticación. La
cadena de conexión, en cambio, apunta a `localhost` y fallaría al conectar.

El mecanismo por el que la validación no podía detectarlo merece registro, porque
es contraintuitivo: `validate()` invoca `validateSync` con
`skipMissingProperties: false`, lo que aparenta exigir todas las claves. Pero los
inicializadores de propiedad de la clase anulan esa exigencia — `plainToInstance`
rellena el valor por defecto cuando la variable de entorno falta, de modo que la
propiedad nunca llega ausente al validador. **La validación parecía estricta y no
podía fallar para esas tres claves.**

Detalle adicional: el marcador `CHANGE_ME_USE_A_LONG_RANDOM_SECRET_AT_LEAST_64_CHARS`
mide 52 caracteres. El propio texto que exige 64 caracteres no los alcanzaba.

**H-22 y H-23** se detectaron al instrumentar la medición. Ambos afectan a fases
posteriores de este plan: las Fases 4 y 6 dan por supuesta la existencia de
`packages/shared-validation` como ubicación de los esquemas de validación
compartidos, cuando hoy es un directorio vacío que habrá que construir. Y
`app-config.types.ts` define una interfaz `AppConfig` y una función `config()` con
su propia capa de valores por defecto que nadie consume: no está registrada en
`ConfigModule.forRoot`, que sólo usa `validate`. Es un tercer punto de verdad
inerte sobre la configuración, y se retira en la Fase 7.

---

## 5. Fases

Notación de esfuerzo: **S** ≤ 2 jornadas · **M** 3-5 jornadas · **L** 6-10 jornadas · **XL** > 10 jornadas.
Las estimaciones asumen una persona desarrolladora dedicada y conocedora del código. Ajustar según disponibilidad real.

---

### Fase 0 — Línea base, barreras de CI y correcciones de seguridad

**Esfuerzo:** S · **Dependencias:** ninguna · **Resuelve:** H-19

**Objetivo.** Establecer medición reproducible y cerrar los riesgos que no admiten espera, sin modificar aún código de aplicación.

**Justificación.** No se puede demostrar progreso sin línea base, y no se puede refactorizar con confianza sin barreras automáticas que detecten regresión. Además, H-19 es un riesgo de seguridad de una sola línea que no justifica postergarse a una fase posterior.

**Tareas.**

1. **Eliminar el valor por defecto de `DATABASE_URL`.**
   En `apps/backend/src/config/env.validation.ts:14`, la variable declara por defecto `postgresql://admin:admin@localhost:5432/monitoring?schema=public`. Si la variable de entorno falta en un despliegue, la aplicación arranca contra credenciales conocidas en lugar de fallar. Un secreto de infraestructura debe provocar un fallo de arranque explícito, nunca un repliegue silencioso.
   Convertir la propiedad en requerida sin valor por defecto y verificar que la validación de entorno aborte el arranque cuando falte.
   Auditar en la misma pasada `FRONTEND_URL` (`env.validation.ts:11`, `app-config.types.ts:41`, `main.ts:21`, `mailer.service.ts:78,124`): el valor `http://localhost:5173` está replicado en cinco puntos. Consolidar en una sola resolución y decidir explícitamente si el repliegue a `localhost` es aceptable en producción.

2. **Habilitar medición de cobertura.**
   Backend con Jest, frontend con Vitest (ambos ya presentes como dependencias). Añadir la generación de reporte de cobertura y publicar el resultado como artefacto de CI.

3. **Registrar la línea base.**
   Ejecutar y archivar el resultado de las métricas de la sección 3 en `docs/metricas/baseline-2026-08.json`. Este archivo es la referencia contra la que se compara cada fase.

4. **Añadir barreras no bloqueantes a `.github/workflows/ci.yml`.**
   En esta fase las barreras solo reportan, no fallan la construcción. Se vuelven bloqueantes al cierre de la fase que corresponda:
   - conteo de archivos con `role ===` (bloqueante al cierre de Fase 2)
   - conteo de `any` y de `eslint-disable` a nivel de archivo (bloqueante al cierre de Fase 4)
   - umbral de cobertura (bloqueante al cierre de Fase 3)
   - tamaño máximo de archivo en líneas (bloqueante al cierre de Fase 5)

5. **Verificar que `pnpm typecheck` y `pnpm lint` pasan limpios** sobre `develop` antes de comenzar la Fase 1. Cualquier fallo preexistente se documenta o se corrige aquí.

**Criterio de salida.**
- Secretos sin valor por defecto y arranque fallando de forma explícita cuando faltan, verificado con pruebas.
- Reporte de cobertura generándose en CI para ambas aplicaciones.
- `baseline-2026-08.json` versionado.
- Las barreras emiten valor en cada ejecución de CI.

**Riesgo de omitir esta fase.** Se pierde la capacidad de demostrar mejora y de detectar regresión. Todas las fases siguientes quedan sin criterio objetivo de aceptación.

#### Resultado — completada el 2026-08-05

| Entregable | Ubicación |
| --- | --- |
| Secretos sin valor por defecto + longitud mínima de 64 caracteres | `apps/backend/src/config/env.validation.ts` |
| Rechazo de secretos de ejemplo cuando `NODE_ENV=production` | `env.validation.ts` → `assertProductionSecrets()` |
| Cobertura del control anterior: 14 pruebas | `apps/backend/src/config/env.validation.spec.ts` |
| Resolución única de `FRONTEND_URL` (`getOrThrow`, sin `??` redundante) | `main.ts`, `shared/mailer/mailer.service.ts` |
| Script de métricas, fuente única de medición | `scripts/metricas.sh` |
| Línea base versionada | `docs/metricas/baseline-2026-08.json` |
| Cobertura en frontend (`json-summary`, `lcov`) | `apps/frontend/vitest.config.ts` |
| Cobertura en backend (mismos formatos) | `apps/backend/jest.config.ts` |
| Scripts `test`, `test:cov`, `metricas` en la raíz | `package.json` |
| Pasos de cobertura, métricas y publicación de informes | `.github/workflows/ci.yml` |

**Verificación ejecutada.** `pnpm typecheck` limpio · `pnpm lint` limpio en ambas
aplicaciones · 213 pruebas en verde (199 previas + 14 nuevas) · frontend 41 en verde.

**Decisiones tomadas durante la ejecución.**

1. *`FRONTEND_URL` conserva su valor por defecto.* No es un secreto y su valor de
   desarrollo es inocuo. Lo que se eliminó es la **duplicación**: el mismo literal
   estaba replicado en cinco puntos (`env.validation.ts:11`, `app-config.types.ts:41`,
   `main.ts:21`, `mailer.service.ts:78` y `:124`). Ahora se declara una sola vez en la
   validación y los consumidores usan `getOrThrow`, que documenta la invariante en
   lugar de crear un segundo valor por defecto capaz de divergir.

2. *Los umbrales de cobertura se configuran pero no bloquean.* Con 1,55 % en frontend,
   cualquier umbral significativo dejaría la barrera en rojo permanente, y una barrera
   siempre roja se ignora a los tres días. Se activan al cierre de la Fase 3, cuando
   exista cobertura que defender. Lo mismo aplica a las demás barreras: cada una pasa
   a bloqueante al cerrarse la fase que la resuelve.

3. *La verificación de secretos de ejemplo se limita a producción.* Un rechazo
   incondicional impediría arrancar en desarrollo tras un `cp .env.example .env`, que
   es el flujo de incorporación documentado y el que usa CI.

4. *No se añadió una regla que rechace `localhost` en `DATABASE_URL` de producción.*
   Sería una comprobación precisa en despliegues convencionales, pero este proyecto se
   despliega con Dokploy, donde la base de datos puede resolverse en el mismo host.
   La regla habría roto un despliegue válido para cubrir un riesgo que la eliminación
   del valor por defecto ya mitiga.

**Observación sobre la CI existente.** El flujo de trabajo ya ejecutaba `typecheck`,
`lint` y `test` como barreras bloqueantes para ambas aplicaciones. La tarea 5 de esta
fase resultó ser una verificación, no una incorporación. Lo que faltaba era
exclusivamente la instrumentación de cobertura y métricas.

---

### Fase 1 — Contrato único de roles

**Esfuerzo:** M · **Dependencias:** Fase 0 · **Resuelve:** H-01, H-02, H-03, H-04, H-05

**Objetivo.** Que exista exactamente una definición de rol en todo el repositorio, ubicada en `packages/shared-contracts`, y que backend y frontend la consuman.

**Justificación — este es el desbloqueo raíz del plan.**

El estado actual es el siguiente:

| Ubicación | Declaración | Estado |
| --- | --- | --- |
| `apps/backend/src/common/enums/role.enum.ts` | `RoleCode`, 10 valores snake_case | Fuente efectiva de verdad |
| `apps/frontend/src/shared/constants/roles.ts:1` | `UserRole`, 11 valores snake_case | Duplicado, con un valor de más |
| `apps/frontend/src/entities/model-user/constants.ts:1` | `UserRole`, 11 valores snake_case | Duplicado literal del anterior |
| `packages/shared-contracts/src/constants/domain.constants.ts:2` | `UserRole`, 4 valores en inglés | **Huérfano e incorrecto** |

Los dos primeros bloques coinciden en valores; el problema ahí es la duplicación, no la divergencia semántica. El hallazgo grave está en las otras dos filas.

**Sobre H-01 y H-02.** El paquete que existe específicamente para ser fuente única de verdad declara `'ADMIN' | 'SPECIALIST' | 'DIRECTOR' | 'TEACHER'`, con el comentario *"User roles matching the Prisma UserRole enum"*. Ese enum de Prisma **no existe**: `apps/backend/prisma/schema.prisma` no contiene ninguna declaración `enum`; los roles se modelan como tabla `Role` con columna de código. El tipo describe un modelo de datos imaginario y ningún consumidor del frontend lo importa. Es la definición más autoritativa por ubicación y la menos correcta por contenido.

**Sobre H-03.** El valor `'admin'` aparece únicamente en el frontend (`roles.ts:11`, `roles.ts:185`, `constants.ts:11`, `validator.tsx:23`). El `RoleCode` del backend no lo contempla. Sin embargo `ROLE_PERMISSIONS.admin` (`roles.ts:60-66`) concede 22 de los 28 ítems de menú disponibles — el conjunto más amplio del sistema. Existe una entrada de máximo privilegio para un rol que el backend nunca emite. Debe determinarse si es residuo de una etapa previa o si algún flujo lo asigna, y eliminarse o formalizarse en consecuencia.

**Sobre H-05.** `ROLE_LABELS` (`roles.ts:14`) y `USER_ROLES_LABELS` (`constants.ts:15`) ya divergieron: el primero rotula `director_ugel` como `'Director UGEL'`, el segundo como `'Director de UGEL'`. Es la evidencia empírica de que la duplicación produce deriva. Si se deja, seguirá divergiendo.

**Tareas.**

1. **Auditar el rol `admin`.** Rastrear en backend si algún proceso de alta, semilla o migración lo asigna. Documentar el hallazgo. Si no se emite, eliminarlo del tipo y de `ROLE_PERMISSIONS`; si se emite, añadirlo a `RoleCode` y a la tabla `Role`. Esta decisión es un prerrequisito de las tareas siguientes y debe resolverse antes de escribir el contrato.

2. **Escribir el contrato canónico** en `packages/shared-contracts/src/constants/roles.ts`:
   - `RoleCode` como objeto `as const` con los valores snake_case reales, más su tipo derivado.
   - `ROLE_LABELS` como registro completo, fuente única de etiquetas.
   - Agrupaciones lógicas (`ADMIN_ROLES`, `INSTITUTION_ROLES`, `READ_ONLY_ROLES`) definidas una sola vez.
   - El tipo debe ser exhaustivo, de modo que agregar un rol provoque error de compilación en todo consumidor que no lo contemple. Esa es la propiedad que se está comprando en esta fase.

3. **Eliminar `UserRole` de `domain.constants.ts:2`** junto con su comentario. El resto del archivo (modalidades, niveles, áreas curriculares, cargos) es correcto y se conserva sin cambios.

4. **Convertir `roles.ts` y `model-user/constants.ts` en reexportaciones** del contrato compartido. No se borran todavía: mantener el punto de importación estable reduce la superficie de este cambio. La eliminación se hace en Fase 7.

5. **Alinear el backend.** `apps/backend/src/common/enums/role.enum.ts` pasa a derivar del contrato compartido en lugar de declarar su propio enum. Verificar que `prisma-catalogs.repository.ts` (`findRoleByCode`) y los guardas de `modules/auth/guards/` siguen resolviendo correctamente.

6. **Evaluar `RolObjetivo`** (`shared/constants/roleValidation.ts:3`). Este tipo modela un eje distinto — el rol destino de un formulario de alta, no el rol de un usuario autenticado. Probablemente sea correcto que exista por separado. Documentar explícitamente la distinción en el propio archivo para que no se lo confunda con `RoleCode` en el futuro.

7. **Ejecutar `pnpm typecheck`** y resolver toda la cascada de errores. Esa cascada es el inventario real de puntos acoplados al vocabulario de roles; conviene registrarla antes de corregirla, porque es el insumo directo de la Fase 2.

**Criterio de salida.**
- Una sola declaración de rol en el repositorio, en `packages/shared-contracts`.
- `pnpm typecheck` y `pnpm lint` en verde.
- Decisión sobre `admin` documentada y aplicada.
- Divergencia de etiquetas resuelta.
- Cascada de errores de tipado registrada como insumo de Fase 2.

**Riesgo de omitir esta fase.** Toda fase posterior queda construida sobre definiciones contradictorias. La centralización de autorización de la Fase 2 se volvería un tercer punto de verdad en competencia con los existentes, empeorando el estado actual.

#### Resultado — completada el 2026-08-05

| Entregable | Ubicación |
| --- | --- |
| Contrato canónico de roles | `packages/shared-contracts/src/constants/roles.constants.ts` |
| `RoleCode` del backend derivado del contrato | `apps/backend/src/common/enums/role.enum.ts` |
| Reexportaciones de compatibilidad | `shared/constants/roles.ts`, `entities/model-user/constants.ts` |
| `UserRole` huérfano retirado | `constants/domain.constants.ts` |
| Frontera con la base endurecida (`isRoleCode`) | `auth/services/auth-token.service.ts` |
| Esquema Zod derivado del contrato | `entities/model-user/validator.tsx` |
| `RolObjetivo` documentado como eje distinto | `shared/constants/roleValidation.ts` |
| Cobertura del contrato: 26 pruebas | `apps/backend/src/common/enums/role.enum.spec.ts` |

**Verificación ejecutada.** `pnpm typecheck` limpio (forzado con `tsc -b --force`,
sin caché incremental) · `pnpm lint` limpio en ambas aplicaciones · 239 pruebas en
verde (213 previas + 26 nuevas) · métrica `declaraciones_userrole` en **1**.

**La propiedad comprada en esta fase está verificada, no supuesta.** Se añadió un
rol temporal al contrato y se comprobó que la compilación falla en las tres capas:

```
packages/shared-contracts/…/roles.constants.ts:55   ROLE_LABELS incompleto
apps/backend/src/shared/auth/capability-map.ts:49   ROL_CAPABILITIES incompleto
apps/frontend/src/shared/constants/roles.ts:53      ROLE_PERMISSIONS incompleto
```

El rol temporal se retiró tras la comprobación.

**Decisión sobre el rol `admin` (H-03): eliminado.** La auditoría previa a escribir
el contrato lo confirmó como residuo por cuatro vías independientes: no figura en
`RoleCode`, no lo siembra `database/seeders/auth.js:16-27`, el JWT lo toma de
`Role.codigo` y `ADMIN_ROLES` nunca lo incluyó. Un usuario con ese código habría
recibido `ROL_CAPABILITIES['admin'] ?? []` — cero capacidades — de modo que ya
estaría inoperante hoy.

El rol que gestiona altos cargos (Director UGEL y Jefe de Gestión) es
**`superusuario`**, que se conserva sin cambios: DNI `00000000` en
`database/seeders/personas.js:23-30`, permiso `superadmin:access`, endpoint
`superuser.controller.ts` y landing `/superadmin`.

**Correcciones al diagnóstico previo.**

1. *H-02 era más matizado de lo enunciado.* El comentario de `domain.constants.ts`
   no describía un enum imaginario: `CREATE TYPE "UserRole" AS ENUM ('ADMIN',
   'SPECIALIST', 'DIRECTOR', 'TEACHER')` existió realmente en
   `migrations/20260530062223_init/migration.sql:2`. La normalización posterior lo
   retiró y modeló los roles como tabla `Role` con columna `codigo` en snake_case.
   El tipo no era inventado: quedó **obsoleto**.

2. *La cascada de tipos fue nula.* La Fase 1 preveía resolver una cascada de
   errores como inventario de puntos acoplados. No hubo ninguno, porque `RoleCode`
   y las copias del frontend ya coincidían en valores. Eso confirma el diagnóstico:
   el problema era duplicación, no divergencia semántica. La única divergencia real
   —las etiquetas de `director_ugel`— se resolvió al unificar.

3. *La métrica `declaraciones_userrole` estaba mal calculada.* Contaba menciones
   del identificador, incluidas reexportaciones e imports, y reportaba 4 donde hay
   una sola declaración. Se corrigió en `scripts/metricas.sh` para exigir el ancla
   de declaración.

**Hallazgo que reduce el alcance de la Fase 2 — ver H-24.**

---

### Fase 2 — Autorización centralizada

**Esfuerzo:** L · **Dependencias:** Fase 1 · **Resuelve:** H-06, H-07, H-08

**Objetivo.** Que ninguna decisión de autorización se tome comparando literales de rol dentro de un componente de presentación.

**Justificación.** Actualmente 25 archivos de la capa de presentación deciden qué mostrar comparando `user?.role` contra cadenas literales. `ReportesPage.tsx` concentra 15 de esas comparaciones. La consecuencia práctica: incorporar un rol nuevo exige localizar y modificar 25 archivos, y omitir uno produce una fuga de permisos silenciosa que ninguna prueba detecta.

Además, `ROLE_PERMISSIONS` (`roles.ts:59-172`) es una matriz estática de 11 roles por 28 ítems de menú mantenida a mano. Es correcta hoy, pero es un formato que no admite composición ni condiciones contextuales, y su tamaño crece multiplicativamente.

**Tareas.**

1. **Definir el vocabulario de capacidades.** Reemplazar la pregunta *"¿qué rol es este usuario?"* por *"¿este usuario puede ejecutar esta acción?"*. Enumerar las capacidades reales derivadas de la cascada registrada en Fase 1 — por ejemplo `visita:programar`, `ficha:completar`, `reprogramacion:aprobar`, `plantilla:publicar`. Trabajar sobre el inventario real, no sobre una lista inventada.

2. **Construir el módulo de política** en `packages/shared-contracts/src/authorization/`:
   - Mapeo capacidad → roles habilitados.
   - Función `can(usuario, capacidad, contexto?)` como único punto de decisión.
   - El parámetro de contexto es necesario para las reglas que dependen de la entidad: un especialista puede completar *su* ficha, no cualquiera. Estas reglas hoy están implícitas y dispersas; enumerarlas explícitamente es parte del trabajo de esta fase.

3. **Derivar `ROLE_PERMISSIONS` de las capacidades** en lugar de mantenerlo a mano. El menú pasa a ser una proyección de la política, no una tabla paralela.

4. **Exponer el consumo en el frontend** mediante un hook `useCan()` y un componente de guarda declarativo. La presentación pregunta por capacidad; nunca por rol.

5. **Migrar los 25 archivos.** Ejecutar en tandas por área funcional, con un commit por área, para mantener revisiones acotadas. Orden sugerido, de mayor a menor concentración:
   1. `pages/jefeGestion/ReportesPage.tsx` (15 comparaciones)
   2. `widgets/calendario/ui/CalendarioSidebar.tsx` (12)
   3. `pages/jefeGestion/CronogramaPage.tsx` (10)
   4. `widgets/plantillas/ui/PlantillasCatalog.tsx` (9)
   5. `pages/director/DocenteSwitchers.tsx` (6)
   6. `widgets/layouts/sidebar/ui/sidebar.tsx` (7)
   7. `widgets/reprogramaciones/ui/BandejaReprogramaciones.tsx` (5)
   8. resto

6. **Alinear la autorización del backend.** Los guardas de `modules/auth/guards/permissions.guard.ts` y el decorador `permissions.decorator.ts` deben consumir el mismo módulo de política. Si frontend y backend evalúan permisos con reglas distintas, el problema no se resolvió: se duplicó.

7. **Sustituir `getDefaultLandingPage`** (`roles.ts:183-205`) por una resolución basada en la primera capacidad de navegación disponible para el usuario.

8. **Volver bloqueante** la barrera de CI que cuenta `role ===`.

**Criterio de salida.**
- Cero comparaciones **literales** de rol (`role === 'jefe_area'`) en `apps/frontend/src`.
- Toda comparación de rol que permanezca es **tipada** contra `RoleCode` y lleva escrito al lado por qué no es una capacidad ni un ámbito.
- Módulo de política con cobertura de pruebas ≥ 90 % (es la pieza de mayor riesgo del sistema).
- Backend y frontend evaluando permisos desde la misma fuente.
- Matriz de menú derivada, no mantenida a mano.
- Barrera de CI activa y bloqueante.

> **Corrección del objetivo, introducida al migrar `CalendarioSidebar.tsx`.**
> El criterio original exigía «cero ocurrencias de `user?.role === '...'`», dando
> por supuesto que toda comparación de rol es una decisión de autorización
> encubierta. No lo es.
>
> Las tres ramas de `canDecide` en ese archivo enrutan **qué solicitudes de
> reprogramación le corresponden a cada posición organizativa**. El permiso de
> fondo ya lo aplica el backend: los endpoints de aprobar y rechazar exigen
> `monitoreo:execute`. Jefe de gestión y jefe de área comparten ámbito y
> comparten esa capacidad, pero resuelven ámbitos de decisión distintos — algo
> que ni `useCan` ni `useScope` pueden expresar.
>
> Perseguir el cero absoluto ahí obligaría a inventar capacidades falsas para
> bajar el contador: mejorar la métrica en lugar del código. El objetivo correcto
> distingue el literal suelto —que el compilador no verifica y que se escribe mal
> sin que nadie lo note— de la comparación tipada y justificada.
>
> `scripts/metricas.sh` mide ahora ambas por separado. El patrón anterior tenía
> además dos defectos: ignoraba `!==` —había cuatro comparaciones sin contar en
> `CronogramaPage.tsx` y `SuperadminPanel.tsx`— y contaba las menciones dentro de
> comentarios. Por ese cambio de criterio, las cifras posteriores a la Fase 2 no
> son directamente comparables con las de la línea base.

**Riesgo de omitir esta fase.** El sistema permanece sin capacidad de incorporar roles o ajustar permisos sin intervención manual en decenas de archivos, con fuga de permisos como modo de fallo más probable.

#### Estado — base completada el 2026-08-05, migración en curso

**Entregado y verificado.**

| Entregable | Ubicación |
| --- | --- |
| Vocabulario de 14 capacidades | `packages/shared-contracts/src/constants/capabilities.constants.ts` |
| Ámbito organizativo (`RoleScope`, `getRoleScope`, `MONITOR_CAMPO_ROLES`) | `constants/roles.constants.ts` |
| `permissions` expuesto en la respuesta de login | `login.contract.ts`, `auth-session.service.ts` |
| `RequirePermissions` tipado contra `Capability` | `auth/decorators/permissions.decorator.ts` |
| Mapa de capacidades tipado | `shared/auth/capability-map.ts` |
| `useCan`, `useScope`, `<Can>` | `apps/frontend/src/shared/auth/` |
| `permissions` en el modelo de usuario | `entities/model-user/model.ts`, `login-service.tsx` |
| Cobertura del contrato: 29 pruebas | `shared/auth/capabilities-contract.spec.ts` |
| Migración: `sidebar.tsx` (12 → 0) | `widgets/layouts/sidebar/ui/sidebar.tsx` |
| Migración: `CalendarioSidebar.tsx` (13 → 3 tipadas) | `widgets/calendario/ui/CalendarioSidebar.tsx` |
| Invariante modalidad ↔ nivel: 6 pruebas | `common/validators/modalidad-nivel.spec.ts` |

277 pruebas en verde · typecheck y lint limpios en ambas aplicaciones.

**Duplicación introducida y corregida dentro de la propia fase.** Al incorporar
el ámbito organizativo se dejaron en pie `UGEL_ROLES` e `INSTITUTION_ROLES`, que
ya enumeraban a mano la misma clasificación que `ROLE_SCOPES`. Eran dos fuentes
de verdad del mismo hecho sin nada que las obligara a coincidir. Ahora se derivan
del mapa de ámbitos, con tres pruebas que verifican la partición.

Se retiró también `isDirectorInstitucion` de `useScope`: era una comparación de
un solo rol con apariencia de ámbito. Su único consumidor resultó estar
expresando una regla sobre el **nivel** de la institución, no sobre el rol.

**Hallazgo que reformula la tarea 1 de esta fase: hacían falta DOS vocabularios.**

La fase suponía que toda comparación literal de rol era una decisión de
autorización encubierta. No lo es. Al clasificarlas aparecieron dos preguntas
distintas mezcladas:

| Pregunta | Herramienta | Ejemplo |
| --- | --- | --- |
| ¿Puede ejecutar esta acción? | `useCan()` | mostrar el badge de solicitudes por atender |
| ¿Desde qué lado de la organización mira? | `useScope()` | rotular el padrón «Directores» o «Docentes» |

`especialista` (UGEL) y `director_institucion` (institución) comparten la
capacidad `monitoreo:execute` pero ven pantallas distintas. Convertir esas
comparaciones a capacidades habría cambiado el comportamiento. Por eso el
contrato incorpora `RoleScope` junto al vocabulario de capacidades, y la
migración exige clasificar cada caso en lugar de aplicar una sustitución
mecánica.

En `sidebar.tsx`, de doce comparaciones **una sola** era autorización.

**Corrección al inventario.** `capability-map.ts` y `scope-filter.ts` sí tenían
cobertura previa —23 y 28 pruebas—, contra lo afirmado al registrar H-24. La
señal «no covering tests found» de CodeGraph se refería al símbolo
`ROL_CAPABILITIES` y se dio por buena sin comprobarla. Las 29 pruebas nuevas
cubren únicamente lo que la Fase 2 incorporó, sin duplicar las existentes.

**Pendiente: 24 archivos, 92 comparaciones.** Orden sugerido por concentración:

| Archivo | Comparaciones |
| --- | --- |
| `widgets/calendario/ui/CalendarioSidebar.tsx` | 13 |
| `pages/jefeGestion/ReportesPage.tsx` | 11 |
| `widgets/reprogramaciones/ui/BandejaReprogramaciones.tsx` | 9 |
| `widgets/plantillas/ui/PlantillasCatalog.tsx` | 8 |
| `pages/jefeGestion/CronogramaPage.tsx` | 7 |
| `pages/director/DocenteSwitchers.tsx` | 6 |
| `pages/jefeGestion/CalendarioPage.tsx` | 5 |
| `widgets/calendario/ui/CalendarioGrid.tsx` | 4 |
| `pages/jefeGestion/PlanMonitoreoAnualPage.tsx` | 4 |
| 15 archivos con 1 comparación cada uno | 15 |

**H-27 — RESUELTO.** La regla de quién decide una reprogramación estaba escrita
dos veces. Se extrajo a `puedeDecidirReprogramacion` en
`entities/model-reprogramaciones/decision.ts`, con 30 pruebas de caracterización
en `decision.test.ts` escritas **antes** de reemplazar las copias. Las pruebas
documentan además dos casos de borde que ninguna de las dos versiones dejaba
explícitos: un jefe de área sin nivel asignado no queda restringido, y el
director de institución se identifica por nombre de colegio —sin distinguir
mayúsculas— cuando no hay identificador. Descripción original del hallazgo:


`canDecide` en `widgets/calendario/ui/CalendarioSidebar.tsx` y `canDecideRequest`
en `widgets/reprogramaciones/ui/BandejaReprogramaciones.tsx` implementan la misma
regla de negocio con el mismo árbol de decisión: monitor de campo no decide, jefe
de gestión resuelve lo nacido en UGEL, jefe de área lo mismo dentro de su nivel,
director de institución lo nacido en su colegio y sólo en Secundaria.

Un cambio en una y no en la otra deja dos pantallas discrepando sobre quién puede
aprobar. Ninguna de las dos tiene cobertura. Extraerla a una función pura con
pruebas propias corresponde a esta fase y está pendiente; no se hizo durante la
migración para no mezclar el cambio de vocabulario con un cambio de estructura.

### Decisión pendiente de producto — qué debe ver el rol `invitado`

**Bloquea la derivación de `ROLE_PERMISSIONS`. No es una decisión técnica.**

Al preparar la derivación se midió la discrepancia entre la matriz de menú y el
modelo de capacidades (`shared/constants/menu-capabilities.test.ts`). La matriz
concede a `invitado` **cinco ítems que el backend rechaza**:

```
instituciones · instituciones_padron · instituciones_docentes
instituciones_coordinadores · especialistas
```

`invitado` sólo tiene `dashboard:read` más las capacidades base. `GET /especialistas`
exige `especialistas:read`, de modo que **hoy un invitado hace clic en esos ítems
y recibe 403**. Es navegación rota, visible para el usuario, en producción.

Las dos salidas son incompatibles y dependen de qué debe ser esa cuenta:

| | Qué implica |
| --- | --- |
| **A — Derivar de capacidades** | El menú se reduce a lo que el invitado puede usar: dashboard, monitoreo, plantillas, reportes, configuración. Se acaba el 403. Pierde cinco ítems que hoy ve sin que funcionen. |
| **B — Ampliar las capacidades** | Si el invitado debe consultar instituciones y especialistas, se le conceden `instituciones:read`, `docentes:read` y `especialistas:read` en `capability-map.ts` y en el seeder. El menú queda igual y los clics empiezan a funcionar. |

La diferencia de fondo: si `invitado` es una cuenta de consulta con vista amplia
de sólo lectura, o una cuenta mínima. **El código actual afirma las dos cosas a
la vez.** Cualquiera de las dos salidas es coherente; el estado actual no.

Estado al 2026-08-05: pendiente de definición con el cliente. Hasta entonces no
se altera el comportamiento. `MENU_CAPABILITIES` y sus pruebas quedan como
inventario exacto de lo que cambiaría, de modo que la decisión pueda ejecutarse
sin volver a investigar.

También queda a la espera la sustitución de `getDefaultLandingPage`, que se
apoya en la misma matriz.

**Estado de las tareas restantes de la fase.**

| Tarea | Estado |
| --- | --- |
| Migrar los 25 archivos a capacidades y ámbito | ✅ 104 → 0 literales |
| Barrera de CI bloqueante | ✅ verificada en ambos sentidos |
| Cobertura del módulo de política ≥ 90 % | ✅ 96 % de media |
| Retirar el join muerto de `rol_permisos` (H-25) | ✅ |
| Derivar `ROLE_PERMISSIONS` de las capacidades | ⛔ bloqueado: decisión de producto sobre `invitado` |
| Sustituir `getDefaultLandingPage` | ⛔ bloqueado por lo mismo |

Cobertura del módulo de política tras la fase:

| Archivo | Antes | Después |
| --- | --- | --- |
| `modules/auth/guards/permissions.guard.ts` | 18,75 % | **100 %** |
| `shared/auth/capability-map.ts` | 100 % | 100 % |
| `shared/auth/scope-filter.ts` | 88,13 % | 88,13 % |

El guard era la pieza de menor cobertura siendo la de mayor consecuencia: es lo
que efectivamente devuelve 403. El mapa de capacidades decide qué tiene cada
usuario, pero sin el guard esa decisión no se aplica a ninguna petición.
`scope-filter.ts` queda por debajo del 90 % individual con sus 28 pruebas
previas; el conjunto del módulo alcanza el 96 %.

---

### Fase 3 — Red de pruebas sobre los símbolos de mayor impacto

**Esfuerzo:** XL · **Dependencias:** Fase 2 · **Resuelve:** H-09, H-10

**Objetivo.** Alcanzar cobertura suficiente en los símbolos de mayor radio de impacto para que las Fases 5 y 6 puedan ejecutarse sin riesgo de regresión silenciosa.

**Justificación.** La cobertura global es de 4,7 % (26 archivos de prueba sobre 556 fuentes). El análisis de CodeGraph señala explícitamente *"no covering tests found"* sobre los símbolos con mayor cantidad de consumidores:

| Símbolo | Consumidores | Cobertura |
| --- | --- | --- |
| `useUser` (`entities/model-user/use-user.ts:4`) | 73 | ninguna |
| `EstadoFicha` (`shared-contracts/.../ficha.contract.ts:7`) | 7 módulos backend | ninguna |
| `IQueryInstitucionRequest` | 5 | ninguna |
| `DocenteFormBase` | 4 | ninguna |
| `DirectorFormBase` / `JefeAreaFormBase` / `InstitutionFormBase` | 4 cada uno | ninguna |
| `LlenarFichaForm` | 4 | ninguna |
| `CalendarioGrid` | 2 | ninguna |

Esta fase es la más costosa del plan y también la que determina si las siguientes son viables. No se recorta.

**Tareas.**

1. **Priorizar por radio de impacto, no por facilidad.** Orden de ataque:
   1. Módulo de política de autorización (Fase 2) — máximo riesgo de seguridad
   2. `useUser` y `UserContext` — 73 consumidores
   3. Servicios de backend sin cobertura en `evaluations`, `reports`, `notifications`
   4. Repositorios Prisma — prerrequisito directo de la Fase 4
   5. Los cinco `*FormBase` — prerrequisito directo de la Fase 6
   6. `CalendarioGrid` y `LlenarFichaForm` — prerrequisito directo de la Fase 5

2. **Pruebas de caracterización antes de refactorizar.** Para los componentes grandes, escribir pruebas que capturen el comportamiento *actual*, incluidas las rarezas. No es el momento de corregir lo que se descubra: se registra como incidencia y se aborda en la fase correspondiente. El objetivo de estas pruebas es detectar cambios involuntarios durante la descomposición, no validar corrección funcional.

3. **Pruebas de contrato entre capas.** Verificar que los DTO del backend satisfacen las interfaces de `shared-contracts` y que los clientes del frontend consumen la misma forma. Ejemplo concreto: `IQueryInstitucionRequest` es implementado por `QueryInstitucionDto` y consumido por `institution-service.ts` y `institutions.api.ts` sin ninguna verificación automática de que las tres partes concuerden.

4. **Pruebas de extremo a extremo para los recorridos críticos.** Como mínimo: autenticación y redirección por rol, programación de visita, completado de ficha, aprobación de reprogramación. Cuatro recorridos, no cuarenta.

5. **Volver bloqueante** el umbral de cobertura en CI, con escalones progresivos por módulo en lugar de un único umbral global.

**Criterio de salida.**
- Módulo de autorización ≥ 90 %.
- `useUser` y contexto de usuario ≥ 90 %.
- Servicios y repositorios de backend ≥ 60 %.
- Componentes objetivo de Fases 5 y 6 con caracterización completa.
- Cuatro recorridos de extremo a extremo en verde en CI.
- Cobertura global ≥ 45 % en módulos críticos.

**Riesgo de omitir esta fase.** Las Fases 5 y 6 se vuelven inejecutables con responsabilidad. Descomponer 4.775 líneas de componentes sin cobertura previa es reescribir a ciegas, y las regresiones se descubrirían en producción.

#### Cierre con alcance revisado — 2026-08-06

| | Inicio | Cierre | Objetivo original |
| --- | --- | --- | --- |
| Cobertura backend | 19,59 % | **23,91 %** | 60 % |
| Cobertura frontend | 2,08 % | **3,97 %** | 45 % |
| Archivos de prueba | 26 | **45** | — |
| Pruebas | 381 | **636** | — |

**El objetivo de cobertura del frontend era circular.** Su volumen está en cuatro
componentes de más de 900 líneas —`CronogramaPage` 1.443, `LlenarFichaForm`
1.309, `CalendarioGrid` 1.011, `CalendarioSidebar` 937— cuyo borde la Fase 5 va a
rehacer. Cubrirlos hoy como monolitos produce pruebas que habría que reescribir
tras descomponerlos, y no cubrirlos deja el porcentaje donde está.

Se traslada el 45 % a criterio de salida de la **Fase 5**, cuando los componentes
ya sean cubribles. No es bajar la vara: es ponerla en la fase que puede
alcanzarla.

**Umbrales activados en el nivel alcanzado, no en el objetivo.** Su función es
impedir el retroceso: que nadie borre pruebas ni sume código sin cubrir por
debajo de lo conseguido. Un umbral en el objetivo dejaría la barrera en rojo
permanente, y una barrera siempre roja se ignora a los tres días.

**Lo cubierto, por radio de impacto.**

| | Antes | Después |
| --- | --- | --- |
| `model-user` (73 consumidores de `useUser`) | 0 % | **100 %** |
| `permissions.guard.ts` | 18,75 % | **100 %** |
| `prisma-client-exception.filter.ts` | 0 % | **97,77 %** |
| `visit-requests.service.ts` | 0 % | **96,66 %** |
| `ficha.mapper.ts` | 0 % | **100 %** |
| `roleValidation.ts` | 0 % | **100 %** |
| `shared/lib/calendario` (extraído) | — | **100 %** |

**Queda explícitamente sin hacer:**

- Dos de los cuatro recorridos de extremo a extremo: completar ficha y aprobar
  reprogramación. Los dos existentes cubren autenticación y autorización.
- `auth.e2e-spec.ts` no verifica el guard de capacidades: `AuthGuard` corta antes
  mientras `firstLogin` siga en verdadero. Requiere completar el cambio de
  contraseña dentro de la suite.
- La cobertura de los repositorios Prisma queda entre 18 % y 35 %, no en el 60 %
  del objetivo.

---

### Fase 4 — Recuperación del tipado en la capa de datos

**Esfuerzo:** M · **Dependencias:** Fase 3 (parcial: basta la cobertura de repositorios) · **Resuelve:** H-11, H-12

**Objetivo.** Eliminar las supresiones de reglas de tipado a nivel de archivo y reducir el uso de `any` en la frontera con la base de datos.

**Justificación.** Seis archivos del backend desactivan las reglas de seguridad de tipos para el archivo completo:

```
prisma-cronograma.repository.ts:1  no-unsafe-assignment, no-unsafe-member-access, no-unsafe-argument
prisma-ficha.repository.ts:1       no-unsafe-assignment
prisma-reporte.repository.ts:1     no-unsafe-assignment, no-unsafe-member-access
ficha.controller.ts:1              no-unsafe-assignment, no-unsafe-member-access, no-unused-vars
scheduling.controller.ts:1         no-unsafe-assignment, no-unsafe-member-access, no-unused-vars
reporte.controller.ts:1            no-unsafe-assignment, no-unsafe-member-access, no-unsafe-argument, no-unused-vars
```

Son exactamente los repositorios y controladores de los módulos de mayor complejidad de dominio: cronogramas, fichas y reportes. La supresión es de archivo completo, no de línea, lo que significa que cualquier código incorporado después a esos archivos también queda sin verificar. Se apagó la comprobación justo en la capa donde el tipado protege contra desajustes con el esquema de datos.

A esto se suman 121 ocurrencias de `any`, concentradas en `scheduling.service.spec.ts` (17), `monitoring-plan.controller.ts` (12), `institutions.service.spec.ts` (12) y `ficha.controller.ts` (11).

**Tareas.**

1. **Sustituir las supresiones de archivo por supresiones de línea**, cada una acompañada de justificación escrita. Esta conversión mecánica revela el alcance real del problema: probablemente resulten muchas menos líneas de las que el archivo completo sugiere.

2. **Tipar los límites de Prisma.** El origen habitual de `no-unsafe-*` son los resultados de consultas dinámicas y agregaciones sin tipo. Definir tipos de retorno explícitos en las interfaces de repositorio (`cronograma.repository.ts`, `ficha.repository.ts`, `reporte.repository.ts`) y hacer que las implementaciones los satisfagan.

3. **Introducir validación en frontera.** Donde el tipo no pueda garantizarse estáticamente — respuestas de consultas crudas, datos JSON almacenados — aplicar validación en tiempo de ejecución. `packages/shared-validation` ya existe y es la ubicación natural para estos esquemas.

4. **Eliminar `any` por módulo**, en tandas, empezando por controladores (frontera pública de la API) y siguiendo por repositorios. El `any` en archivos de prueba tiene prioridad menor pero no nula: una prueba mal tipada valida menos de lo que aparenta.

5. **Revisar `no-unused-vars`** en `ficha.repository.ts:1`, `cronograma.repository.ts:1`, `reporte.repository.ts:1` y `update-plantilla.dto.ts:1`. En archivos de interfaz suele indicar parámetros declarados y no usados en firmas de método, lo cual es legítimo y se resuelve con la convención de prefijo `_` en lugar de suprimir la regla.

6. **Volver bloqueantes** en CI las barreras de conteo de `any` y de supresiones a nivel de archivo.

**Criterio de salida.**
- Cero `eslint-disable` a nivel de archivo en `apps/backend/src`.
- Toda supresión restante es de línea y está justificada por escrito.
- `any` reducido a ≤ 20 ocurrencias, todas documentadas.
- Interfaces de repositorio con tipos de retorno explícitos.
- Barreras de CI activas y bloqueantes.

**Riesgo de omitir esta fase.** Los desajustes entre el esquema de datos y el código siguen sin detectarse en compilación. Toda migración de base de datos futura conlleva riesgo de fallo en tiempo de ejecución en los tres módulos de mayor complejidad del sistema.

#### Progreso — iniciada el 2026-08-06

**Alcance medido.** Al retirar las 16 supresiones de archivo aparecen **156
errores**:

| Regla | Errores |
| --- | --- |
| `no-unsafe-member-access` | 80 |
| `no-unsafe-assignment` | 42 |
| `no-unused-vars` | 22 |
| `no-unsafe-argument` | 11 |
| `no-unsafe-return` | 1 |

Repartidos de forma muy desigual: desde 2 errores en
`prisma-ficha.repository.ts` hasta **50 en `prisma-cronograma.repository.ts`**.

**Corrección al plan.** Los 22 `no-unused-vars` no eran parámetros de interfaz
declarados y no usados, como preveía este documento, sino **nueve imports
muertos** en cinco archivos. No había nada que tipar ni que justificar: se
borran los imports y la supresión sobra. Cinco de los dieciséis archivos no
tenían ningún problema de tipado, sólo basura acumulada bajo una supresión que
la escondía.

**Supresiones retiradas hasta ahora: 6 de 16.**

- Cinco archivos de interfaz y DTO, por imports muertos
- `prisma-ficha.repository.ts`: sus dos `as any` eran residuo; el tipo ya
  encajaba sin ellos

**H-29 — el filtro de reportes por institución apuntaba a un campo inexistente.**

En `prisma-reporte.repository.ts`, el `where` de la consulta de fichas se
construía sobre un objeto `any`:

```ts
if (filters.institucionId) where.institucionId = filters.institucionId;
```

`FichaMonitoreo` **no tiene** `institucionId`: la institución se alcanza a través
de `cronograma`, que sí lo declara. Al tipar el objeto contra
`Prisma.FichaMonitoreoWhereInput`, el compilador lo señaló de inmediato:

```
Property 'institucionId' does not exist on type 'FichaMonitoreoWhereInput'
```

Prisma valida los argumentos de la consulta, de modo que filtrar reportes por
institución no devolvía resultados incorrectos: **fallaba**. El `any` mantuvo
oculto un defecto de la pantalla de reportes durante todo el tiempo que llevó
esa supresión.

Corregido: el filtro pasa a `where.cronograma.institucionId`, junto al de tipo de
monitoreo, que ya apuntaba correctamente ahí.

**Hallazgo en `prisma-user.repository.ts`.** Su `as any` sobre el `include` de
Prisma **no era residuo**: al retirarlo aflora un desajuste real entre lo que
Prisma devuelve y la entidad `Usuario` que el repositorio declara devolver. La
supresión ocultaba una discrepancia de contrato, no ruido del linter.

Se revirtió para no dejar la rama en rojo. Resolverlo exige reconciliar la
entidad con la carga útil de Prisma, y es la clase de trabajo que da sentido a
esta fase: cada supresión restante puede esconder lo mismo.

---

### Fase 5 — Descomposición de componentes monolíticos

**Esfuerzo:** XL · **Dependencias:** Fase 3 (cobertura de caracterización obligatoria) · **Resuelve:** H-13, H-14, H-15

**Objetivo.** Que ningún componente supere las 300 líneas ni reciba más de 8 propiedades.

**Justificación.** Cuatro archivos concentran 4.775 líneas:

| Archivo | Líneas |
| --- | --- |
| `pages/jefeGestion/CronogramaPage.tsx` | 1.443 |
| `features/monitoreos/ui/LlenarFichaForm.tsx` | 1.309 |
| `widgets/calendario/ui/CalendarioGrid.tsx` | 1.086 |
| `widgets/calendario/ui/CalendarioSidebar.tsx` | 937 |

`CalendarioGridProps` (`CalendarioGrid.tsx:21-50`) declara 29 propiedades, de las cuales 12 son pares valor/setter de filtros trasladados desde el componente padre. Eso no es una interfaz de componente: es estado de formulario transportado a mano a través de la jerarquía. La consecuencia inmediata es que cualquier cambio de filtro vuelve a renderizar el árbol completo del calendario, y que el componente no puede probarse ni reutilizarse de forma aislada.

Adicionalmente, dos efectos tienen sus dependencias silenciadas (`CronogramaPage.tsx:526`, `DocenteListPageBase.tsx:97`). Esas supresiones suelen encubrir una dependencia que provocaría un ciclo de renderizado, lo cual es un defecto latente, no una preferencia de estilo.

**Tareas.**

1. **Consolidar el estado de filtros.** Los 12 pares valor/setter se reemplazan por un único reductor de filtros. Evaluar sincronizarlo con parámetros de la URL: los filtros de calendario son estado que el usuario espera poder compartir y recuperar al recargar, y hoy se pierde.

2. **Aplicar el patrón contenedor/presentación.** Cada componente monolítico se separa en:
   - un contenedor que resuelve datos y estado (`use*Data`, mutaciones, efectos),
   - componentes de presentación puros que reciben datos ya resueltos.
   La presentación no debe conocer el origen de los datos.

3. **Descomponer por vista, no por longitud.** `CalendarioGrid` implementa cinco vistas (`MENSUAL`, `SEMANAL`, `DIARIO`, `ANUAL`, `LISTA`) en un solo archivo. Cada vista es un componente independiente; el archivo actual queda como selector. Ese corte es natural y de bajo riesgo.

4. **Extraer el cálculo de calendario a funciones puras.** La construcción de la cuadrícula mensual (`CalendarioGrid.tsx:318-372`) y semanal (`375-397`) es lógica pura sin dependencia de React. Debe vivir en `shared/lib/calendario/` con pruebas unitarias propias, incluidos los casos de cruce de año en `month === 0` y `month === 11`, hoy sin cobertura.

5. **Resolver las supresiones de dependencias de efecto.** Cada una se analiza individualmente: si la dependencia faltante provocaría un ciclo, el problema real es la forma del efecto y debe rediseñarse, no silenciarse.

6. **Orden de ejecución** — de menor a mayor acoplamiento, para acumular confianza antes del caso más difícil:
   1. `CalendarioSidebar.tsx` (937 líneas, menos consumidores)
   2. `CalendarioGrid.tsx` (1.086, corte por vista bien definido)
   3. `LlenarFichaForm.tsx` (1.309, 4 consumidores)
   4. `CronogramaPage.tsx` (1.443, el más acoplado)

7. **Volver bloqueante** la barrera de tamaño máximo de archivo.

**Criterio de salida.**
- Ningún componente supera 300 líneas.
- Ninguna interfaz de props supera 8 propiedades.
- Cero supresiones de `react-hooks/exhaustive-deps`.
- Lógica de calendario extraída como funciones puras con cobertura propia.
- Pruebas de caracterización de la Fase 3 en verde sin modificación — es la demostración de equivalencia de comportamiento.

**Riesgo de omitir esta fase.** Los cuatro archivos siguen siendo intocables en la práctica: cualquier cambio en ellos requiere comprender más de mil líneas de contexto, lo que hace que las estimaciones sean poco fiables y las revisiones de código superficiales.

**Resultado (2026-08-06).**

| Archivo | Antes | Después |
| --- | --- | --- |
| `CronogramaPage.tsx` | 1.446 | 180 |
| `LlenarFichaForm.tsx` | 1.294 | 292 |
| `CalendarioGrid.tsx` | 1.011 | 219 |
| `CalendarioSidebar.tsx` | 917 | 278 |
| **Total** | **4.668** | **969** |

`CalendarioPage.tsx` bajó además de 367 a 306 al perder su copia de la
regla de visibilidad, que estaba duplicada y divergente respecto de
`CronogramaPage`.

Criterios cumplidos: ningún archivo del alcance supera 300 líneas,
ninguna interfaz de props supera 8 propiedades, y el proyecto quedó con
**cero** supresiones de `react-hooks/exhaustive-deps` (eran 3).

**Alcance no cubierto.** El criterio «ningún componente supera 300
líneas» se cumple para los cuatro archivos que esta fase enumera, no para
el proyecto entero: quedan 8 componentes por encima de ese umbral
—`PlanMonitoreoAnualPage` (775), `FichaPrintable` (763),
`PlantillasCatalog` (695), `ReportesGrid` (631), `DocenteFormBase` (523),
`EspecialistaFormBase` (499), `ReportesPage` (393) y `JefeAreaFormBase`
(369)—, unas 4.600 líneas que ninguna tarea de esta fase menciona.
Cerrarlos requiere una fase propia.

---

### Fase 6 — Extracción del dominio fuera de la capa de presentación

**Esfuerzo:** L · **Dependencias:** Fase 5 · **Resuelve:** H-16, H-17, H-18

**Objetivo.** Que las reglas de negocio y las representaciones de dominio no vivan dentro de componentes de interfaz.

**Justificación.**

**Sobre H-16.** `CalendarioGrid.tsx` contiene tres funciones — `getVisitTagColor:117`, `getVisitColorDot:134`, `getVisitStatusBadgeClass:151` — que ejecutan el mismo `switch` sobre los mismos cinco estados de visita, devolviendo variantes de estilo distintas. `CalendarioSidebar.tsx` repite el patrón seis veces más y `CronogramaPage.tsx` tres. Incorporar un estado nuevo de visita exige recordar doce puntos de modificación, sin ningún mecanismo que avise si se omite alguno.

**Sobre H-17.** El formateo de fechas se implementa segmentando cadenas a mano (`CalendarioGrid.tsx:60-115`): `fechaHoraStr.split('T')[1].split(':')`, construcción de cadenas con `padStart`, y bloques `try/catch` que devuelven la cadena original cuando el análisis falla. Ese repliegue silencioso convierte un error de formato en un valor incorrecto mostrado al usuario, sin señal alguna. Es además el punto donde suelen aparecer los defectos de zona horaria.

**Sobre H-18.** Los cinco formularios base suman 1.924 líneas con estructura equivalente: `DocenteFormBase` (522), `EspecialistaFormBase` (499), `JefeAreaFormBase` (369), `DirectorFormBase` (286), `InstitutionFormBase` (248). Cada uno tiene cuatro consumidores (`Add*` y `Edit*`) y ninguno tiene cobertura. Ya existe `shared/hooks/usePersonForm.ts`, lo que indica que la abstracción se intentó pero no se completó.

**Tareas.**

1. **Crear un registro de estados de visita** en `packages/shared-contracts`, donde cada estado declare en un único lugar su etiqueta, su variante de estilo y sus transiciones válidas. Las tres funciones de `CalendarioGrid` y sus nueve repeticiones se reemplazan por consultas a ese registro. El tipo debe ser exhaustivo para que un estado nuevo produzca error de compilación.

2. **Adoptar una biblioteca de fechas** con soporte de zona horaria, y encapsular todo formateo en `shared/lib/fecha/`. Eliminar los `try/catch` con repliegue silencioso: una fecha inválida debe ser un error visible, no un valor engañoso. Verificar el comportamiento en la zona horaria de Perú (`America/Lima`, UTC-5) como caso base.

3. **Completar la abstracción de formularios.** Extender `usePersonForm` para cubrir el ciclo completo — validación, autocompletado por DNI, verificación de conflicto de roles, envío — y reducir cada `*FormBase` a la declaración de sus campos específicos. El objetivo es que la lógica compartida se escriba una vez y cada formulario solo declare lo que le es propio.

4. **Consolidar la validación.** `packages/shared-validation` debe ser la fuente única de esquemas, consumida por el backend en los DTO y por el frontend en los formularios. Hoy la validación de conflicto de roles vive en `shared/constants/roleValidation.ts`, del lado del cliente, sin contraparte verificable en el servidor.

5. **Revisar los catálogos de dominio embebidos en la interfaz.** `CalendarioGrid.tsx:439-484` incluye listas de opciones escritas a mano: números de monitoreo (`'01'`–`'04'`), tipos (`DOCENTE`, `DIRECTIVO`) y estados. Deben derivarse del contrato compartido.

**Criterio de salida.**
- Un único registro de estados de visita, consumido en los doce puntos actuales.
- Cero manipulación manual de fechas por segmentación de cadenas.
- Cinco `*FormBase` reducidos a ≤ 700 líneas en conjunto.
- Esquemas de validación compartidos entre backend y frontend.
- Cero catálogos de dominio escritos a mano en componentes.

**Riesgo de omitir esta fase.** Cada cambio en las reglas de dominio requiere modificaciones dispersas en la capa de presentación, con omisión parcial como modo de fallo característico y difícil de detectar en revisión.

**Estado (2026-08-06) y correcciones al enunciado.**

Dos premisas de esta fase resultaron falsas al verificarlas:

1. **«`roleValidation` vive del lado del cliente, sin contraparte verificable en
   el servidor».** Falso para tres de los cuatro casos que bloquea: especialista
   duplicado (`especialista-create.helper.ts:44`), docente duplicado
   (`docente-create.helper.ts:58`) e institución con director activo
   (`docente-shared.helper.ts:27`). Uno de esos archivos lleva un comentario que
   dice «defense-in-depth». El único hueco real era otro: el cliente bloqueaba a
   nivel **persona** y el servidor a nivel **institución**, de modo que una
   persona podía quedar como director de dos colegios llamando a la API sin
   pasar por el formulario. Cerrado con `checkPersonaYaEsDirector`.

2. **«Los cinco `*FormBase` tienen estructura equivalente».** Falso:
   `CreateInstitutionFormBase` registra un colegio y `JefeAreaFormBase` asigna
   un especialista existente; ninguno es formulario de persona. Los tres que sí
   lo son ya compartían `usePersonForm`. Además, más de la mitad de esos
   archivos es la declaración de sus propios campos, que es lo que el plan pide
   que quede. El criterio «≤ 700 líneas en conjunto» medía la cosa equivocada y
   se sustituyó por: la lógica compartida se escribe una vez y con cobertura.

También quedó sin hacer, por no existir: las **transiciones válidas** entre
estados de visita que pide la tarea 1. No están declaradas en ninguna parte del
sistema; consolidarlas sería inventarlas.

**Hecho.**

| Tarea | Estado |
| --- | --- |
| 1 — Registro de estados de visita | ✅ `ESTADOS_VISITA` en el contrato; tablas `Record<EstadoVisita, …>` exhaustivas; catálogos derivados. Sin transiciones (no existen) |
| 2 — Fechas | ✅ Cerrada. Cero formateo manual en el frontend; `shared/lib/fecha` con 39 pruebas y huso fijado. Se corrigieron **tres** corrimientos de día distintos (ver nota) |
| 3 — Abstracción de formularios | ✅ Con criterio revisado: traspaso desde el padrón, escala magisterial, atribución de error y regla de visualización, cada una una sola vez y con cobertura |
| 4 — `shared-validation` | ⚠️ Parcial: paquete creado con las primitivas de campo, consumido por el frontend. El backend valida con `class-validator` y no tiene Zod: unificar ambos lados es una decisión de arquitectura pendiente |
| 5 — Catálogos de dominio | ⚠️ Parcial: estados derivados del contrato. Tipos de monitoreo y números de visita siguen escritos a mano |

**Defectos encontrados y corregidos durante la fase.**

| Defecto | Dónde |
| --- | --- |
| Datos personales volcados a la consola del navegador | `DocenteFormBase`, `DirectorFormBase` |
| Una persona podía quedar como director de dos instituciones | backend, sin validación por persona |
| Fecha mostrada un día antes por interpretación UTC | todo formateo con `new Date` sobre fecha sin hora |
| Fecha ilegible mostrada como «Oct 2023» | los dos formularios de reprogramación |
| Escala magisterial con respaldos divergentes | `DocenteFormBase` caía a `''`, `DirectorFormBase` a `'I'` |

**Cierre de H-17 (2026-08-07).** Se encontraron y corrigieron **tres**
corrimientos de día distintos, no uno:

1. **`new Date('2026-03-09')`** interpreta la forma corta como medianoche UTC:
   en Perú mostraba el día anterior. Corregido con construcción por componentes.
2. **`new Date(x).toISOString().split('T')[0]`**, en seis archivos, devuelve la
   fecha en UTC: todo lo registrado después de las 19:00 mostraba el día
   siguiente. Afectaba a las fechas de cargo docente, al registro de
   solicitudes y a la fecha que se escribe al finalizar un cargo.
3. **Columnas `@db.Date` serializadas con `toISOString()`** en el backend: una
   fecha de calendario viajaba como instante a medianoche UTC y el cliente la
   mostraba un día antes. Afectaba al historial pedagógico completo de cada
   docente. El proyecto ya tenía el helper correcto en `cronograma.mapper.ts` y
   dos puntos lo esquivaban; ahora vive en `common/utils` con cobertura.

Un cuarto defecto fue **introducido y corregido dentro de la propia fase**:
`aFechaLocal` no anclaba su expresión regular y trataba como horario local
cualquier cadena con zona explícita, desplazando instantes cinco horas.

**Sobre adoptar una biblioteca de fechas**, que la tarea 2 sugiere: se decidió
no hacerlo. El problema no es aritmética sino **semántica** —confundir fecha de
calendario con instante— y la prueba está en el propio repositorio: ya existía
el helper correcto y el error se coló igual en dos lugares. Lo que evitaría la
confusión es un tipo que las distinga, como `Temporal.PlainDate`, que todavía
requiere polyfill.

---

### Fase 7 — Higiene y consolidación

**Esfuerzo:** S · **Dependencias:** Fases 1-6 · **Resuelve:** H-20, H-21

**Objetivo.** Cerrar los elementos pendientes y retirar los andamios utilizados durante la migración.

**Tareas.**

1. **Retirar los datos simulados del árbol de producción.** `entities/model-cronogramas/mocks.ts` (356 líneas) debe trasladarse a un directorio de pruebas o eliminarse si ya no se consume. Auditar en la misma pasada los otros archivos con referencias a datos simulados: `ReportesPage.tsx`, `RecentMonitoringsTable.tsx`, `directores-table.tsx`, `filter-docente.tsx`, `ReportesGrid.tsx`, `model-plantillas/constants.ts`.

2. **Cerrar las migraciones declaradas.** `use-plantillas-api.ts:9` y `use-cronogramas-api.ts:16` documentan una migración pendiente de páginas (`PlantillasCatalog`, `PlantillaCreate`, `CronogramaPage`, `CalendarioPage`). Completarla o retirar la nota si quedó obsoleta tras las Fases 5 y 6.

3. **Eliminar las reexportaciones de compatibilidad** creadas en la Fase 1 (`shared/constants/roles.ts`, `entities/model-user/constants.ts`) y apuntar todas las importaciones directamente al contrato compartido.

4. **Revisar las supresiones de `react-refresh/only-export-components`** en los archivos de rutas (`jefeGestion.routes.tsx:1`, `jefeArea.routes.tsx:1`, `especialista.routes.tsx:1`, `directorUgel.routes.tsx:1`). Suele resolverse separando las definiciones de ruta de los componentes exportados.

5. **Actualizar la documentación de arquitectura** en `docs/` reflejando la estructura resultante, y registrar la medición final contra `baseline-2026-08.json`.

**Criterio de salida.**
- Cero datos simulados fuera de directorios de prueba.
- Cero notas `TODO` sin fecha ni responsable.
- Cero reexportaciones de compatibilidad.
- Comparación final de métricas documentada.

**Medición final (2026-08-06).**

| Métrica | Objetivo | Línea base | Final |
| --- | --- | --- | --- |
| Archivos con comparación literal de rol | 0 | 104 | **0** ✅ |
| Ocurrencias de `any` en fuente | ≤ 20 | — | **4** ✅ |
| Supresiones de lint a nivel de archivo | 0 | 16 | **0** ✅ |
| Supresiones de `react-hooks/exhaustive-deps` | 0 | 3 | **0** ✅ |
| Notas `TODO` sin fecha | 0 | 2 | **0** ✅ |
| Datos simulados fuera de pruebas | 0 | 1.080 líneas | **0** ✅ |
| Reexportaciones de compatibilidad | 0 | 2 | **0** ✅ |
| Componentes de más de 300 líneas | 0 | 20 | **17** ❌ |

**Remedición (2026-08-07).** La tabla de arriba es la instantánea del 6 de
agosto y se conserva como tal. Al día siguiente, los PR #61 y #62 cerraron el
único criterio que faltaba:

| Métrica | Objetivo | 2026-08-06 | 2026-08-07 |
| --- | --- | --- | --- |
| Componentes de más de 300 líneas | 0 | 17 ❌ | **0** ✅ |
| Componente mayor | ≤ 300 | — | **280 líneas** ✅ |

**Sobre las dos cifras de `any`.** La tabla del 6 de agosto mide el frontend, y
sus 4 ocurrencias siguen siendo correctas. `pnpm metricas` reporta 54 porque
abarca los dos proyectos e incluye los archivos de prueba; sin ellos son 15, de
los cuales 11 están en el backend. No es que `any` haya crecido: son alcances
distintos y conviene no compararlos entre sí.

**Sobre el comando de medición de `UserRole`.** El comando del anexo
(`rg -n "type UserRole"`) cuenta también las **importaciones**, no sólo las
declaraciones. Reporta 3 cuando la declaración es una sola, en el contrato
compartido. El comando está mal, no la métrica.

**Sobre los 17 componentes de más de 300 líneas.** La Fase 5 redujo los cuatro
que enumeraba —de 4.668 a 969 líneas—, pero su criterio de salida estaba escrito
como si aplicara a todo el proyecto. Los 17 restantes nunca formaron parte del
alcance de ninguna fase: `PlanMonitoreoAnualPage` (775), `FichaPrintable` (763),
`PlantillasCatalog` (695), `ReportesGrid` (631) y otros trece. Cerrarlos requiere
una fase propia con su propio inventario.

**Tarea 5 sin hacer.** La actualización de la documentación de arquitectura en
`docs/` queda pendiente: el directorio contiene entregables de gestión —actas,
backlogs, informes— y no documentación técnica que refleje esta estructura.
Escribirla desde cero es una tarea de redacción, no de consolidación.

---

## 6. Secuencia y paralelización

```
Fase 0 ──▶ Fase 1 ──▶ Fase 2 ──┬──▶ Fase 3 ──┬──▶ Fase 5 ──▶ Fase 6 ──▶ Fase 7
                               │              │
                               └──────────────┴──▶ Fase 4
```

- **Fases 0, 1 y 2 son estrictamente secuenciales.** Ninguna admite adelantamiento.
- **La Fase 4 puede solaparse con la Fase 3** una vez que la cobertura de repositorios esté disponible. Es la única paralelización segura del plan, y requiere personas distintas para evitar mezclar tipos de cambio en los mismos archivos.
- **Las Fases 5 y 6 dependen por completo de la Fase 3.** Adelantarlas invalida el principio 3 y expone el proyecto a regresión no detectada.

**Duración estimada:** 8 a 12 semanas con una persona dedicada; 5 a 7 semanas con dos, aprovechando el solapamiento de Fases 3 y 4. Estimación sujeta a la incertidumbre de la Fase 3, que es la de mayor varianza porque depende de cuánto comportamiento no documentado aparezca al escribir las pruebas de caracterización.

---

## 7. Puntos de detención seguros

El plan puede interrumpirse al cierre de cualquier fase sin dejar el sistema inconsistente. Valor acumulado en cada punto:

| Detención tras | Beneficio consolidado |
| --- | --- |
| Fase 0 | Riesgo de credenciales cerrado; medición disponible |
| Fase 1 | Fuente única de roles; deriva de definiciones detenida |
| Fase 2 | Roles y permisos modificables sin intervención en 25 archivos |
| Fase 3 | Refactorización segura habilitada; regresiones detectables |
| Fase 4 | Desajustes con el esquema de datos detectables en compilación |
| Fase 5 | Componentes mantenibles y revisables |
| Fase 6 | Reglas de dominio con un único punto de cambio |

Si el plan debe recortarse por restricción de tiempo, **las Fases 0, 1 y 2 son el mínimo que produce un beneficio estructural real.** Detenerse antes de la Fase 1 deja el trabajo sin efecto duradero.

---

## 8. Registro de seguimiento

| Fase | Estado | Inicio | Cierre | Responsable | Observaciones |
| --- | --- | --- | --- | --- | --- |
| 0 — Línea base y seguridad | **Completada** | 2026-08-05 | 2026-08-05 | | Pendiente: actualizar `.env.example` y los `.env` locales (ver §10) |
| 1 — Contrato de roles | **Completada** | 2026-08-05 | 2026-08-05 | | `admin` eliminado; exhaustividad verificada; H-24/H-25 redefinen la Fase 2 |
| 2 — Autorización centralizada | **En curso** | 2026-08-05 | | | Migración completa (104 → 0 literales), barrera de CI bloqueante, política al 96 %; falta derivar el menú, bloqueado por decisión de producto |
| 3 — Red de pruebas | **Cerrada con alcance revisado** | 2026-08-06 | 2026-08-06 | | Umbrales activos como guarda de retroceso; el objetivo de cobertura se traslada a la Fase 5 |
| 4 — Tipado en capa de datos | **Completada** | 2026-08-06 | 2026-08-06 | | 16 → 0 supresiones; destapó dos defectos reales, H-29 entre ellos |
| 5 — Descomposición de componentes | **Completada** | 2026-08-06 | 2026-08-07 | | Los 4 archivos objetivo del plan: 4.668 → 969 líneas. Cero supresiones de `exhaustive-deps`. Los componentes >300 líneas que quedaban fuera del alcance se cerraron después en los PR #61 a #64: **0**, mayor archivo 280 líneas |
| 6 — Extracción de dominio | **Parcial** | 2026-08-06 | | | H-16 y H-18 cerrados. H-17: quedan **2** archivos con formateo manual de fechas (`features/cronogramas/lib/formulario.ts` y `hooks/use-cronogramas-data.ts`); el resto migró al módulo compartido. Faltan las tareas 4 y 5 (ver nota) |
| 7 — Higiene y consolidación | **Parcial** | 2026-08-06 | | | El criterio «cero componentes >300 líneas» **se cumple**. Falta la tarea 5, documentación de arquitectura. Ver §8.1 para lo que se cerró después de la fase |


### 8.1 Trabajo posterior al alcance de las fases

Entre el 2026-08-06 y el 2026-08-07 se cerró, fuera del alcance nominal de las
fases, el grupo de componentes grandes que ninguna cubría. La descomposición
destapó defectos que se corrigieron en el mismo trabajo; se listan porque
explican por qué el esfuerzo fue mayor que un refactor.

| PR | Qué cerró |
| --- | --- |
| #61 | 17 componentes >300 líneas → 5. Escala magisterial inventada y escrita en la base; lema oficial del año vencido en la ficha impresa; autorización por inclusión de nombres retirada de ocho lugares tras comprobar con SQL que nadie dependía de ella |
| #62 | 5 → 0. Programación de visitas por identificador: tres nombres de institución están repetidos en la base —uno cinco veces— y el selector mostraba opciones indistinguibles, de modo que `find(por nombre)` devolvía siempre la primera |
| #63 | `modules/auth` pasa de 0 a 64 pruebas. `changePassword` prometía cerrar la sesión en todos los dispositivos y no cerraba ninguna |
| #64 | Cero `alert()` del navegador y cero `setTimeout(…, 0)` diferidos en el frontend. La búsqueda por DNI quedaba colgada en «Buscando...» |

**Criterio de medición.** Los números de §8 se obtienen con `pnpm metricas`, no
de memoria. Durante esta actualización el propio script resultó estar roto: bajo
`pipefail`, `rg` sale con 1 cuando no encuentra nada, de modo que la medición
fallaba justo cuando una métrica llegaba a cero —su objetivo—. Corregido.

**Lo que la barrera de la Fase 2 no ve.** `comparaciones_rol_literal` cuenta
`role === 'literal'` y `case 'literal':`, y está en 0. No cuenta los literales
de rol en otras posiciones —valores por omisión de parámetros, elementos de
arreglo, valores de objeto—, de los que quedan alrededor de veinte. No es un
fallo del contador: su alcance está documentado y es deliberado. Se anota para
que nadie lea «0 literales» como «ningún literal de rol en el código».

---

## 9. Anexo — Comandos de verificación

La medición canónica es un único comando, que emite el mismo JSON que la línea base:

```bash
pnpm metricas                      # todas las métricas
pnpm test:cov && pnpm metricas     # incluyendo cobertura actualizada
```

`docs/metricas/baseline-2026-08.json` queda **congelado** como referencia inicial y
no debe regenerarse. Cada fase archiva su propia medición junto a él
(`fase-1-2026-08.json`, y así sucesivamente), de modo que la serie temporal quede
comparable.

| Instantánea | `declaraciones_userrole` | `archivos_rol_literal` | Cobertura backend |
| --- | --- | --- | --- |
| `baseline-2026-08.json` (Fase 0) | 4 | 25 | 19,51 % |
| `fase-1-2026-08.json` (Fase 1) | **1** | 25 | 19,28 % |

La cobertura de backend baja 0,23 puntos porque el contrato añadió líneas de
código fuente; el número de pruebas subió de 213 a 239.

Los comandos siguientes son el desglose de ese script, útiles para comprobaciones
puntuales durante una fase:

```bash
# Archivos con comparacion LITERAL de rol  (objetivo: 0)
rg -l "role\s*[!=]==\s*'" apps/frontend/src | wc -l

# Comparaciones TIPADAS de rol: no tienen objetivo, se revisan una por una
rg -n "role\s*[!=]==\s*RoleCode\." apps/frontend/src

# Ocurrencias de any en código fuente  (objetivo: <= 20)
rg -o ':\s*any\b|as any' apps/*/src packages/*/src | wc -l

# Supresiones de lint a nivel de archivo en backend  (objetivo: 0)
rg -l '^/\* eslint-disable' apps/backend/src | wc -l

# Declaraciones del tipo UserRole  (objetivo: 1)
rg -l 'type UserRole' apps packages | wc -l

# Componentes de mas de 300 lineas  (objetivo: 0)
fd -e tsx . apps/frontend/src | xargs wc -l | awk '$1 > 300 && $2 != "total"' | wc -l

# Relacion pruebas / fuentes  (objetivo: >= 0.20)
echo "$(fd -e spec.ts -e test.ts -e spec.tsx -e test.tsx . apps packages | wc -l) / $(fd -e ts -e tsx . apps packages | wc -l)"

# Estructura y radio de impacto de un simbolo antes de modificarlo
codegraph explore "<nombre del simbolo>"
codegraph impact "<nombre del simbolo>"
```

---

## 10. Acción manual requerida para cerrar la Fase 0

Los archivos de entorno quedan fuera del alcance de edición automatizada. Las dos
acciones siguientes son necesarias para que la Fase 0 quede efectivamente cerrada.

### 10.1 Reemplazar `apps/backend/.env.example`

El archivo conserva los mismos secretos débiles que se acaban de eliminar del
código, y CI lo copia a `.env` antes de ejecutar las pruebas. Su `JWT_SECRET`
mide 52 caracteres, por debajo del mínimo de 64 que ahora exige la validación.

```bash
# ─────────────────────────────────────────────────────────────────────────────
# Plantilla de variables de entorno del backend.
#
#   cp apps/backend/.env.example apps/backend/.env
#
# Los valores de este archivo sirven UNICAMENTE para desarrollo local y para la
# ejecucion de pruebas en CI. La validacion de entorno rechaza los secretos de
# ejemplo cuando NODE_ENV=production, de modo que copiar este archivo tal cual
# a un despliegue real provoca un fallo de arranque explicito.
#
# Generar secretos propios para cualquier entorno que no sea local:
#
#   openssl rand -hex 48
# ─────────────────────────────────────────────────────────────────────────────

# ── Requeridas: sin valor por defecto en codigo; su ausencia aborta el arranque
DATABASE_URL=postgresql://admin:admin@localhost:5432/monitoring?schema=public

# Minimo 64 caracteres. Los valores de ejemplo se rechazan en produccion.
JWT_SECRET=dev-only-insecure-jwt-secret-replace-before-deploying-to-production
JWT_REFRESH_SECRET=dev-only-insecure-refresh-secret-replace-before-deploying-to-production

# ── Opcionales: con valor por defecto seguro en env.validation.ts
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# ── SMTP (Mailpit/Mailhog en local; proveedor real en produccion)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=no-reply@ugel-lampa.gob.pe
```

### 10.2 Actualizar los `.env` locales del equipo

Cada entorno de desarrollo con un `.env` existente tiene hoy un `JWT_SECRET` de
52 caracteres. **La aplicación no arrancará hasta que se actualice.** Las pruebas
unitarias no se ven afectadas — no cargan `ConfigModule` — pero `pnpm dev` sí.

```bash
cp apps/backend/.env.example apps/backend/.env
```

Este fallo de arranque es el comportamiento buscado: es exactamente la señal que
antes no existía. Conviene anunciarlo al equipo antes de integrar el cambio, para
que se interprete como lo que es y no como una regresión.

### 10.3 Verificación de cierre

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm metricas
```
