import type { FormularioCronograma } from './formulario';

/**
 * Traducción del formulario al contrato de la API.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estaba dentro de `handleFormSubmit`, mezclada
 * con la orquestación de guardado, navegación y avisos.
 *
 * ── Ya no hay traducción de nombres ──
 * El formulario guardaba el nombre visible de especialista, institución y
 * evaluado, y acá se lo revertía a identificador buscando por cadena. Con tres
 * nombres de institución repetidos en la base —uno de ellos cinco veces— esa
 * búsqueda devolvía siempre la primera coincidencia, de modo que la visita
 * podía quedar programada en el colegio equivocado sin que nada avisara.
 *
 * Ahora el formulario ya lleva los identificadores; lo único que queda por
 * comprobar es que sigan existiendo en los catálogos cargados.
 */

/** Identificadores que la API espera. */
export interface ReferenciasResueltas {
  monitorId: string;
  institucionId: string;
  evaluadoId: string;
}

interface CatalogoDeReferencias {
  especialistas: readonly { id: string }[];
  instituciones: readonly { id: string }[];
  docentes: readonly { id: string }[];
}

/**
 * Comprueba que los tres identificadores elegidos existan en los catálogos.
 *
 * Devuelve `null` si alguno no está: guardar una referencia que el catálogo no
 * reconoce dejaría la visita colgada de un dato que ya no existe —una
 * institución dada de baja, un docente desactivado— y el error se descubriría
 * recién en el backend.
 */
export function resolverReferencias(
  formulario: FormularioCronograma,
  catalogo: CatalogoDeReferencias,
): ReferenciasResueltas | null {
  const existe = (lista: readonly { id: string }[], id: string) =>
    !!id && lista.some((elemento) => elemento.id === id);

  if (
    !existe(catalogo.especialistas, formulario.monitorId) ||
    !existe(catalogo.instituciones, formulario.institucionId) ||
    !existe(catalogo.docentes, formulario.evaluadoId)
  ) {
    return null;
  }

  return {
    monitorId: formulario.monitorId,
    institucionId: formulario.institucionId,
    evaluadoId: formulario.evaluadoId,
  };
}

/** Detalles sin espacios sobrantes, o ausentes si no se cargó nada. */
const detallesDe = (observaciones: string) => observaciones.trim() || undefined;

/**
 * Hora con segundos.
 *
 * El campo `datetime-local` entrega `HH:MM` y la API espera `HH:MM:SS`; algunos
 * navegadores ya incluyen los segundos, y entonces no hay que agregarlos.
 */
const conSegundos = (hora: string) => (hora.length === 5 ? `${hora}:00` : hora);

export function aPayloadDeCreacion(
  formulario: FormularioCronograma,
  referencias: ReferenciasResueltas,
) {
  const [fecha, hora] = formulario.fechaHora.split('T');

  return {
    ...referencias,
    tipoMonitoreo: formulario.tipo,
    numeroVisita: parseInt(formulario.visita, 10),
    fechaProgramada: fecha,
    horaInicio: conSegundos(hora),
    modalidad: formulario.modalidad,
    nivelEducativo: formulario.nivel,
    detalles: detallesDe(formulario.observaciones),
  };
}

/**
 * En edición sólo viajan detalles y estado: la fecha se cambia por solicitud de
 * reprogramación, y el resto de los campos define la identidad de la visita.
 */
export function aPayloadDeEdicion(formulario: FormularioCronograma) {
  return {
    detalles: detallesDe(formulario.observaciones),
    estado: formulario.estado,
  };
}
