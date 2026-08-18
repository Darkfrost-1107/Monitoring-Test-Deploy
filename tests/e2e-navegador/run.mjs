// Runner de la suite e2e de navegador. Ejecuta las jornadas en orden, recoge el
// resultado de cada una y escribe results.json (insumo del reporte HTML).
//
// Requiere el stack aislado levantado (ver README.md).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));

// Orden: primero se crean los cargos (J5/J6) para que J1 cubra esos roles;
// J3 llena una ficha que J4 luego puede firmar.
const JORNADAS = [
  ['J5', './journeys/j5-crear-coordinador.mjs'],
  ['J6', './journeys/j6-crear-jefe-taller.mjs'],
  ['J1', './journeys/j1-auth.mjs'],
  ['J2', './journeys/j2-crear-cronograma.mjs'],
  ['J3', './journeys/j3-llenar-ficha.mjs'],
  ['J4', './journeys/j4-firmar.mjs'],
];

const resultados = [];
const logReal = console.log;

for (const [id, mod] of JORNADAS) {
  let linea = '';
  console.log = (...a) => {
    const s = a.join(' ');
    if (s.startsWith('RESULT ')) linea = s.slice('RESULT '.length);
    logReal(...a);
  };
  let ok = false;
  try {
    const { run } = await import(mod);
    ok = await run();
  } catch (e) {
    linea = `${id} FAIL ${e.message}`;
    logReal(`[runner] ${id} lanzó:`, e.message);
  }
  console.log = logReal;
  resultados.push({ id, ok, detalle: linea });
}

const pasaron = resultados.filter((r) => r.ok).length;
writeFileSync(
  join(AQUI, 'results.json'),
  JSON.stringify({ fecha: new Date().toISOString(), pasaron, total: resultados.length, resultados }, null, 2),
);
logReal(`\n=== Suite e2e navegador: ${pasaron}/${resultados.length} jornadas OK ===`);
process.exit(pasaron === resultados.length ? 0 : 1);
