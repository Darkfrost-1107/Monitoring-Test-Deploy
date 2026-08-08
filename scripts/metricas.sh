#!/usr/bin/env bash
#
# Emite las métricas de deuda técnica definidas en PLAN_REMEDIACION.md (§3)
# como un único objeto JSON en stdout.
#
# Uso:
#   ./scripts/metricas.sh                    # imprime JSON
#   ./scripts/metricas.sh > docs/metricas/baseline-2026-08.json
#
# Requiere: ripgrep (rg), fd.
#
# Este script es la fuente única de medición: CI y desarrollo local ejecutan
# exactamente el mismo cálculo, de modo que los valores son comparables entre sí.

set -euo pipefail

cd "$(dirname "$0")/.."

# Sólo se miden las rutas que existen. `packages/shared-validation` está hoy
# vacío (únicamente .gitkeep); se incorporará al medirse cuando tenga contenido.
CANDIDATOS=(apps/backend/src apps/frontend/src packages/shared-contracts/src packages/shared-validation/src)
SRC_GLOBS=()
for ruta in "${CANDIDATOS[@]}"; do
  [ -d "$ruta" ] && SRC_GLOBS+=("$ruta")
done

# ── Recuento de archivos ─────────────────────────────────────────────────────
archivos_fuente=$(fd -e ts -e tsx --type f . "${SRC_GLOBS[@]}" | wc -l)
archivos_prueba=$(fd -e spec.ts -e test.ts -e spec.tsx -e test.tsx --type f . apps packages | wc -l)

# ── Fase 1: unicidad del contrato de roles (objetivo: 1) ─────────────────────
# Cuenta DECLARACIONES, no reexportaciones. Un `export { type UserRole } from …`
# o un `import { … }` mencionan el nombre sin declararlo; contarlos daba 4 donde
# hay una sola definicion. El ancla a inicio de linea y la exigencia de `=` o `{`
# distinguen la declaracion de la mera mencion.
declaraciones_userrole=$(rg -l '^export type UserRole\s*=|^(export )?enum RoleCode\s*\{' \
  apps packages -g '!node_modules' -g '!dist' | wc -l)

# ── Fase 2: autorización en capa de presentación ─────────────────────────────
#
# Se distinguen DOS cosas que el patrón anterior contaba igual:
#
#   literal  `user.role === 'jefe_area'`        objetivo: 0
#   tipada   `user.role === RoleCode.JEFE_AREA` objetivo: sin objetivo
#
# El objetivo de la fase NO es eliminar toda comparación de rol. Existe
# comparación legítima: cuando la decisión es genuinamente sobre la posición
# organizativa de alguien y no sobre lo que puede hacer. En CalendarioSidebar,
# las tres ramas de `canDecide` enrutan qué solicitudes le corresponden a cada
# posición; el permiso de fondo ya lo aplica el backend. Perseguir el cero ahí
# obligaría a inventar capacidades falsas para bajar el contador.
#
# Lo que sí debe llegar a cero son los literales sueltos, que el compilador no
# verifica y que se escriben mal sin que nadie lo note.
#
# El patrón anterior tenía dos huecos: ignoraba `!==` —había cuatro sin contar—
# y contaba las menciones dentro de comentarios.
# El patrón cubre DOS formas de comparar contra un rol. Sólo contaba la primera,
# y `getDefaultLandingPage` tenía siete literales en forma de `case` que el
# contador reportaba como cero:
#
#   user.role === 'jefe_area'          comparación directa
#   switch (role) { case 'jefe_area':  rama de switch
#
# Los `case` se acotan a los diez códigos de rol conocidos para no capturar
# switches sobre otros tipos —`RolObjetivo` en `roleValidation.ts` modela el rol
# DESTINO de un formulario de alta y es una clasificación distinta.
CODIGOS="director_ugel|jefe_area|jefe_gestion|especialista|director_institucion|coordinador_pedagogico|jefe_taller|docente|invitado|superusuario"
PATRON_ROL_LITERAL="role\s*[!=]==\s*'|case\s+'($CODIGOS)'"
PATRON_ROL_TIPADA="role\s*[!=]==\s*RoleCode\.|case\s+RoleCode\."
SIN_COMENTARIOS='^[^:]+:[0-9]+:\s*(\*|//|/\*)'

# `rg` termina con código 1 cuando no encuentra nada, y bajo `pipefail` eso
# abortaba el script justo al alcanzar el objetivo de cero. El `|| true` trata la
# ausencia de coincidencias como lo que es: un resultado válido, y el bueno.
# `roleValidation.ts` se excluye a propósito. Su `switch` opera sobre
# `RolObjetivo` —el rol DESTINO de un formulario de alta—, cuyos valores se
# solapan con los de `RoleCode` por coincidencia del dominio y no porque sean el
# mismo concepto. Un patrón de texto no puede distinguir el sujeto de un switch,
# de modo que la exclusión se declara aquí en lugar de ensuciar el conteo.
EXCLUIR='-g!**/roleValidation.ts'

contar_ocurrencias() {
  local patron="$1"
  rg -n --no-heading "$EXCLUIR" "$patron" apps/frontend/src 2>/dev/null \
    | rg -v "$SIN_COMENTARIOS" \
    | rg -o "$patron" \
    | wc -l || true
}

archivos_rol_literal=$(rg -l "$EXCLUIR" "$PATRON_ROL_LITERAL" apps/frontend/src 2>/dev/null | wc -l || true)
comparaciones_rol_literal=$(contar_ocurrencias "$PATRON_ROL_LITERAL")
comparaciones_rol_tipada=$(contar_ocurrencias "$PATRON_ROL_TIPADA")

# ── Fase 4: tipado en capa de datos (objetivos: 0 y <= 20) ───────────────────
# `rg` sale con 1 cuando no encuentra nada, y bajo `pipefail` eso mataba el
# script justo cuando la métrica llegaba a su objetivo: medir el éxito era
# imposible. `|| true` acota el fallo a lo que de verdad es un fallo.
supresiones_archivo=$(rg -l '^/\* eslint-disable' apps/backend/src apps/frontend/src | wc -l || true)
ocurrencias_any=$(rg -o ':\s*any\b|as any' "${SRC_GLOBS[@]}" | wc -l || true)

# ── Fase 5: tamaño de componentes (objetivo: 0 por encima de 300) ────────────
# Los `.test.tsx` quedan fuera: la métrica mide componentes, y un archivo de
# pruebas no lo es. Crece con los casos cubiertos, no con la complejidad de lo
# que mantiene; partirlo por número de líneas fragmenta una suite coherente sin
# ganar nada. La línea base (17 componentes sobre 300) se midió cuando no había
# pruebas de componente, así que medía sólo código de producción por accidente:
# excluirlas devuelve la métrica a lo que siempre midió.
componentes() { fd -e tsx --type f . apps/frontend/src | rg -v '\.test\.tsx$'; }

componentes_sobre_300=$(componentes \
  | xargs wc -l 2>/dev/null \
  | awk '$2 != "total" && $1 > 300' | wc -l)
componentes_sobre_700=$(componentes \
  | xargs wc -l 2>/dev/null \
  | awk '$2 != "total" && $1 > 700' | wc -l)
# `head` cerraría la tubería y `pipefail` lo interpretaría como fallo (SIGPIPE);
# awk consume toda la entrada y evita esa condición.
componente_mayor=$(componentes \
  | xargs wc -l 2>/dev/null \
  | awk '$2 != "total" && $1 > max { max = $1 } END { print max + 0 }')

# ── Fase 6: duplicación de formularios (objetivo: <= 700) ────────────────────
lineas_formbase=$(fd -e tsx 'FormBase' apps/frontend/src \
  | xargs wc -l 2>/dev/null \
  | awk '$2 == "total" {print $1; found=1} END {if (!found) print 0}')
if [ -z "$lineas_formbase" ]; then
  lineas_formbase=$(fd -e tsx 'FormBase' apps/frontend/src | xargs wc -l 2>/dev/null | awk '{s+=$1} END {print s}')
fi

# ── Derivadas ────────────────────────────────────────────────────────────────
ratio_pruebas=$(awk -v t="$archivos_prueba" -v f="$archivos_fuente" \
  'BEGIN { if (f == 0) print 0; else printf "%.4f", t / f }')

# ── Cobertura ────────────────────────────────────────────────────────────────
# Se lee del informe `json-summary` que dejan Vitest y Jest. El ratio de
# archivos de prueba sobre archivos fuente es sólo un indicador grueso: dice
# cuántos archivos tienen prueba, no cuánto código se ejecuta. La cobertura de
# sentencias es la cifra que gobierna los umbrales de la Fase 3.
#
# Requiere haber ejecutado `pnpm test:cov`; si no hay informe, se emite null.
leer_cobertura() {
  local archivo="$1"
  if [ -f "$archivo" ]; then
    # .total.statements.pct, sin depender de jq.
    rg -o '"statements":\{[^}]*"pct":([0-9.]+)' -r '$1' "$archivo" | awk 'NR==1'
  else
    echo "null"
  fi
}

cobertura_frontend=$(leer_cobertura apps/frontend/coverage/coverage-summary.json)
cobertura_backend=$(leer_cobertura apps/backend/coverage/coverage-summary.json)
: "${cobertura_frontend:=null}"
: "${cobertura_backend:=null}"

cat <<JSON
{
  "generado": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rama": "$(git rev-parse --abbrev-ref HEAD)",
  "commit": "$(git rev-parse --short HEAD)",
  "metricas": {
    "archivos_fuente": $archivos_fuente,
    "archivos_prueba": $archivos_prueba,
    "ratio_pruebas": $ratio_pruebas,
    "declaraciones_userrole": $declaraciones_userrole,
    "archivos_rol_literal": $archivos_rol_literal,
    "comparaciones_rol_literal": $comparaciones_rol_literal,
    "comparaciones_rol_tipada": $comparaciones_rol_tipada,
    "supresiones_lint_archivo": $supresiones_archivo,
    "ocurrencias_any": $ocurrencias_any,
    "componentes_sobre_300_lineas": $componentes_sobre_300,
    "componentes_sobre_700_lineas": $componentes_sobre_700,
    "componente_mayor_lineas": $componente_mayor,
    "lineas_formbase": $lineas_formbase,
    "cobertura_sentencias_frontend": $cobertura_frontend,
    "cobertura_sentencias_backend": $cobertura_backend
  },
  "objetivos": {
    "declaraciones_userrole": 1,
    "archivos_rol_literal": 0,
    "supresiones_lint_archivo": 0,
    "ocurrencias_any": 20,
    "componentes_sobre_300_lineas": 0,
    "componente_mayor_lineas": 300,
    "lineas_formbase": 700,
    "ratio_pruebas": 0.20,
    "cobertura_sentencias_frontend": 45,
    "cobertura_sentencias_backend": 60
  }
}
JSON
