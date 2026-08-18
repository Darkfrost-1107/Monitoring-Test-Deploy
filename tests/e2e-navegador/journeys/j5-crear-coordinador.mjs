// J5 — El Director de I.E. asigna un Coordinador Pedagógico.
import { asignarCargo } from './_asignar-cargo.mjs';

export const run = () =>
  asignarCargo({
    etiqueta: 'J5-crear-coordinador',
    ruta: '/instituciones/coordinadores',
    boton: /Asignar Coordinador/i,
    nombreRol: 'Coordinador Pedagógico',
  });

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1));
