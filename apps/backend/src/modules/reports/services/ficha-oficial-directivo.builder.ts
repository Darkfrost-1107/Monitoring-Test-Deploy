import {
  construirFichaOficialDocente,
  type FichaOficialDocente,
  type FichaOficialRaw,
} from './ficha-oficial-docente.builder.js';

/** Quien se evalúa en esta ficha es el director de la institución. */
export interface DirectorMonitoreado {
  nombre: string;
  dni: string;
  correo: string;
  celular: string;
  encargado: boolean;
  designado: boolean;
  nombrado: boolean;
}

export type FichaOficialDirectivo = Omit<FichaOficialDocente, 'director'> & {
  titulo: string;
  director: DirectorMonitoreado;
};

/**
 * Ficha oficial de monitoreo al director de I.E.
 *
 * Tiene el diseño de la docente, así que se parte de la misma vista y se cambia lo
 * que difiere: el director monitoreado es el **evaluado** (no el director vigente de
 * la institución), y su condición laboral marca encargado, designado o nombrado. «Por
 * función» cuenta como encargado, igual que en el formulario impreso del frontend.
 */
export function construirFichaOficialDirectivo(raw: FichaOficialRaw): FichaOficialDirectivo {
  const base = construirFichaOficialDocente(raw);
  const condicion = raw.cronograma.evaluado.condicionLaboral;

  return {
    ...base,
    titulo: `FICHA DE MONITOREO Y ACOMPAÑAMIENTO AL DIRECTOR(A) DE I.E. - ${base.anio}`,
    // El evaluado es el director: firma como tal, no como docente.
    firmas: base.firmas.map((f) => (f.rol === 'Docente' ? { ...f, rol: 'Director' } : f)),
    director: {
      nombre: base.docente.nombre,
      dni: base.docente.dni,
      correo: base.docente.correo,
      celular: base.docente.celular,
      encargado: condicion === 'Encargado' || condicion === 'Por Función',
      designado: condicion === 'Designado',
      nombrado: condicion === 'Nombrado',
    },
  };
}
