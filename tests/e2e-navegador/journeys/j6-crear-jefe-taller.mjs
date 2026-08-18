// J6 — El Director de I.E. asigna un Jefe de Taller.
import { asignarCargo } from './_asignar-cargo.mjs';

export const run = () =>
  asignarCargo({
    etiqueta: 'J6-crear-jefe-taller',
    ruta: '/instituciones/jefes-taller',
    boton: /Asignar Jefe de Taller/i,
    nombreRol: 'Jefe de Taller',
  });

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1));
