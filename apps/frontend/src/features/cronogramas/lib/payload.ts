import type { FormularioCronograma } from './formulario';

/**
 * Traducción del formulario al contrato de la API.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estaba dentro de `handleFormSubmit`, mezclada
 * con la orquestación de guardado, navegación y avisos.
 *
 * El formulario trabaja con nombres —es lo que el usuario elige en los
 * selectores— y la API con identificadores. Esa traducción es donde una visita
 * puede terminar asignada a la persona equivocada, y por eso vale probarla.
 */

/** Identificadores que la API espera en lugar de los nombres. */
export interface ReferenciasResueltas {
  monitorId: string;
  institucionId: string;
  evaluadoId: string;
}

interface CatalogoDeReferencias {
  especialistas: readonly { id: string; nombre: string }[];
  instituciones: readonly { id: string; nombre: string }[];
  docentes: readonly { id: string; nombres: string; apellidos: string }[];
}

/**
 * Traduce los tres nombres elegidos a sus identificadores.
 *
 * Devuelve `null` si alguno no se encuentra: guardar con una referencia sin
 * resolver dejaría la visita colgada de un dato que no existe.
 */
export function resolverReferencias(
  formulario: FormularioCronograma,
  catalogo: CatalogoDeReferencias,
): ReferenciasResueltas | null {
  const especialista = catalogo.especialistas.find((e) => e.nombre === formulario.especialista);
  const institucion = catalogo.instituciones.find((i) => i.nombre === formulario.institucion);
  const docente = catalogo.docentes.find(
    (d) => `${d.nombres} ${d.apellidos}` === formulario.docente.trim(),
  );

  if (!especialista || !institucion || !docente) return null;

  return {
    monitorId: especialista.id,
    institucionId: institucion.id,
    evaluadoId: docente.id,
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
