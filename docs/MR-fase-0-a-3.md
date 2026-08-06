# Remediación técnica — Fases 0 a 3 (parcial)

## Resumen

**¿Qué cambia y por qué?**

Ejecuta las tres primeras fases de `PLAN_REMEDIACION.md`, el plan de remediación
acordado tras auditar qué impedía reestructurar el proyecto para escalar.

No cambia funcionalidad visible salvo en dos puntos, ambos correcciones de
defectos y señalados abajo. El grueso es contrato compartido, cobertura y
barreras automáticas.

**42 commits · 99 archivos · +7.482 / −633**

---

## Los dos defectos corregidos que sí cambian lo que ve el usuario

### 1. La calificación mostrada no era la que se guardaba (H-28)

La regla del baremo estaba implementada dos veces: la pantalla de llenado
calculaba sobre el puntaje total con una tabla propia, el backend sobre el
promedio con los umbrales EDU-0009. El valor de la pantalla nunca llegaba al
servidor, de modo que nada obligaba a que coincidieran.

Coincidían sólo para plantillas de exactamente cinco desempeños. Con las
plantillas que siembra el proyecto, el defecto estaba **vivo**:

| Plantilla | Puntaje | Antes mostraba | Se guardaba |
| --- | --- | --- | --- |
| DIRECTIVO (2 desempeños) | 7 | Logro destacado | **Logro esperado** |
| DOCENTE (3 desempeños) | 5 | Inicio | **En proceso** |
| DOCENTE (3 desempeños) | 10 | Logro destacado | **Logro esperado** |

El cálculo pasa a `packages/shared-contracts/src/evaluations/baremo.ts` como
única definición. **Las fichas ya cerradas tienen el nivel correcto en base de
datos**: el error era de visualización al cerrar.

### 2. Secretos de infraestructura con valor por defecto

`DATABASE_URL`, `JWT_SECRET` y `JWT_REFRESH_SECRET` declaraban un valor por
defecto. Una variable ausente producía un arranque silencioso con credenciales
conocidas; en el caso de los secretos de firma, una clave conocida permite
fabricar un token válido para cualquier rol.

La validación aparentaba ser estricta y no podía fallar: los inicializadores de
propiedad rellenan el valor antes de que `validateSync` lo evalúe.

> **Acción requerida al integrar.** Quien tenga un `.env` anterior debe
> actualizarlo o la aplicación no arrancará: `cp apps/backend/.env.example
> apps/backend/.env`. El fallo de arranque es el comportamiento buscado.

---

## Qué entrega cada fase

### Fase 0 — Línea base y seguridad

- Secretos sin valor por defecto, mínimo de 64 caracteres y rechazo de valores
  de ejemplo en producción
- `scripts/metricas.sh` como fuente única de medición, con línea base versionada
- Cobertura instrumentada en ambas aplicaciones, sin umbral bloqueante todavía
- Scripts `test`, `test:cov` y `metricas` en la raíz, que no existían

### Fase 1 — Contrato único de roles

Existían cuatro declaraciones de rol. Ahora hay una, en `shared-contracts`.

- Rol `admin` eliminado: no figuraba en `RoleCode`, no lo sembraba el seeder y
  el backend nunca podía emitirlo, pero `ROLE_PERMISSIONS` le concedía 22 de los
  28 ítems de menú
- La frontera con la base se endurece: `Role.codigo` se validaba con una
  aserción sin comprobar
- **Verificado, no supuesto**: se añadió un rol temporal y se comprobó que rompe
  la compilación en las tres capas

### Fase 2 — Autorización por capacidades (5 de 6)

El backend ya tenía un modelo de capacidades completo; el frontend lo ignoraba y
decidía comparando literales de rol en 25 archivos.

- **104 → 0** comparaciones literales; las 47 restantes son tipadas contra
  `RoleCode` y llevan escrito por qué no son una capacidad
- `permissions` se expone al frontend, que antes las descartaba
- `useCan()` y `useScope()`: hacían falta **dos** vocabularios. Buena parte de
  las comparaciones no preguntaban qué puede hacer alguien sino desde qué lado
  de la organización mira
- Regla de decisión de reprogramaciones unificada: estaba duplicada palabra por
  palabra en dos pantallas, sin cobertura en ninguna
- Barrera de CI bloqueante, verificada en ambos sentidos
- Módulo de política al 96 %; `PermissionsGuard` pasó de 18,75 % a 100 %

### Fase 3 — Red de pruebas (en curso)

| | Antes | Ahora |
| --- | --- | --- |
| Cobertura backend | 19,59 % | **24,32 %** |
| Cobertura frontend | 2,08 % | **3,95 %** |
| Pruebas | 381 | **636** |

- `model-user` al 100 %: `useUser` tiene 73 consumidores y estaba en cero
- Filtro de errores de Prisma al 97,77 %: todo error de base pasa por ahí
- Cálculo de cuadrículas del calendario extraído y cubierto, con los cruces de
  año que nadie verificaba
- Dos recorridos de extremo a extremo, con base efímera obligatoria

---

## Advertencias para el revisor

**No hay cambios de esquema.** Ninguna migración de Prisma.

**Las pruebas de extremo a extremo se niegan a ejecutarse contra una base que no
sea efímera.** La guarda existe por un incidente durante el desarrollo: una
primera versión se ejecutó contra la base de desarrollo y bloqueó una cuenta al
comprobar el rechazo de credenciales incorrectas. Un recorrido e2e nunca es de
sólo lectura.

**Bloqueado por decisión de producto.** Derivar `ROLE_PERMISSIONS` del modelo de
capacidades está listo pero sin aplicar: hoy el rol `invitado` ve cinco ítems de
menú que el backend rechaza con 403, y elegir entre reducir el menú o ampliar sus
capacidades es una decisión de negocio. El inventario exacto de lo que cambiaría
está en `menu-capabilities.test.ts`.

**Defecto conocido, sin corregir.** El resumen de credenciales que imprime el
seeder no coincide con los roles que crea: `40000004` y `40000005` aparecen como
especialistas y son jefes de área; `40000006` y `40000007` figuran como
directores de institución y son especialistas.

---

## Referencias

- **Tarea:** remediación técnica, Fases 0 a 3 de `PLAN_REMEDIACION.md`
- **Módulo:** `shared` · `auth` · `evaluations` · `scheduling` · `workspace`

- [x] Mi código compila y pasa el linter (`pnpm typecheck` / `pnpm lint` / `pnpm build`)
- [x] Probé estos cambios localmente y funcionan
- [x] No estoy subiendo credenciales, `.env` reales, ni `console.log` olvidados
- [x] Si modifiqué la Base de Datos, incluí la migración de Prisma — *no hubo cambios de esquema*
