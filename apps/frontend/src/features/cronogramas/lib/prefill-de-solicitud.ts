import { fechaProgramadaPorDefecto, type FormularioCronograma } from './formulario';

/**
 * La precarga del formulario cuando se entra desde «Atender» una solicitud de
 * visita.
 *
 * Vivía dentro de un efecto de `useProgramacionCronograma`, envuelto en un
 * `setTimeout(…, 0)` y sin decir nada cuando algo no se resolvía: si la
 * solicitud venía de una I.E. fuera del alcance de quien programa, el
 * formulario se abría vacío y sin explicación.
 */

/** Lo que la navegación trae desde la solicitud de visita. */
export interface SolicitudAAtender {
  solicitudId?: string;
  institucionId: string;
  docenteId?: string | null;
}

export interface CatalogosDePrefill {
  instituciones: readonly { id: string; modalidad: string; nivelEducativo: string }[];
  docentes: readonly { id: string }[];
}

export interface Prefill {
  campos: Partial<FormularioCronograma>;
  /** Qué no se pudo precargar, en texto para el usuario, o nulo si todo salió. */
  faltante: string | null;
}

export function prefillDeSolicitud(
  solicitud: SolicitudAAtender,
  catalogos: CatalogosDePrefill,
): Prefill {
  const institucion = catalogos.instituciones.find((i) => i.id === solicitud.institucionId);

  const docente = solicitud.docenteId
    ? catalogos.docentes.find((d) => d.id === solicitud.docenteId)
    : undefined;

  const campos: Partial<FormularioCronograma> = {
    fechaHora: fechaProgramadaPorDefecto(),
    tipo: 'DOCENTE',
    // La modalidad y el nivel encabezan la cascada: sin ellos, elegir la
    // institución después la borraría igual. Van juntos o no van.
    ...(institucion
      ? {
          institucionId: institucion.id,
          modalidad: institucion.modalidad,
          nivel: institucion.nivelEducativo,
        }
      : {}),
    ...(docente ? { evaluadoId: docente.id } : {}),
  };

  return { campos, faltante: loQueNoSeResolvio(solicitud, institucion, docente) };
}

function loQueNoSeResolvio(
  solicitud: SolicitudAAtender,
  institucion: unknown,
  docente: unknown,
): string | null {
  const faltan: string[] = [];

  if (!institucion) faltan.push('la institución');
  if (solicitud.docenteId && !docente) faltan.push('el docente');

  if (faltan.length === 0) return null;

  return `No se pudo precargar ${faltan.join(' ni ')} de la solicitud: puede estar fuera de su ámbito. Complete el formulario a mano.`;
}
