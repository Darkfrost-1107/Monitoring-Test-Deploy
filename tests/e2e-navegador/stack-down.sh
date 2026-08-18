#!/usr/bin/env bash
# Baja el stack aislado de la suite e2e.
set -uo pipefail
LOGS="$(dirname "${BASH_SOURCE[0]}")/.logs"
for svc in backend frontend; do
  if [ -f "$LOGS/$svc.pid" ]; then kill "$(cat "$LOGS/$svc.pid")" 2>/dev/null || true; rm -f "$LOGS/$svc.pid"; fi
done
docker rm -f monitoring-postgres-e2e >/dev/null 2>&1 || true
echo "Stack e2e detenido."
