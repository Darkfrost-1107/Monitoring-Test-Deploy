import type { RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Con qué plantilla se evalúa una visita.
 *
 * Fase 5 de PLAN_REMEDIACION.md. La cascada vivía dentro de `CalendarioSidebar`,
 * entre la maquetación del panel de detalle, y decide algo de fondo: qué
 * instrumento se aplica en el aula, es decir qué preguntas se hacen y con qué
 * escala se califica. Una selección equivocada no produce un error visible —
 * produce una ficha evaluada con el instrumento de otra institución.
 *
 * ── Orden de prioridades ──
 * 1. La plantilla que el propio evaluador creó para su I.E., cuando es personal
 *    de institución que además levanta ficha en el aula.
 * 2. La plantilla de su institución educativa.
 * 3. La plantilla general de la UGEL, incluidas las que no tienen autor sellado
 *    por ser anteriores al sello.
 * 4. Cualquier vigente del tipo pedido.
 *
 * Si ninguna acierta devuelve `null`: no hay instrumento aplicable y la visita
 * no se puede evaluar. Quien llama debe decirlo, no seguir de largo.
 */

/** Roles de institución que crean su propia plantilla (todos menos la UGEL). */
const ROLES_AUTOR_INSTITUCION: readonly RolAutorPlantilla[] = [
  'director_ie',
  'coordinador_pedagogico',
  'jefe_taller',
];

/** ¿La plantilla la creó personal de una I.E. (no la UGEL)? */
const esAutorDeInstitucion = (rol: RolAutorPlantilla | undefined): boolean =>
  !!rol && ROLES_AUTOR_INSTITUCION.includes(rol);

/** Nombre del instrumento según a quién se evalúa. */
export const TIPO_MONITOREO_POR_VISITA = {
  DOCENTE: 'Monitoreo Docente',
  DOCENTE_EIB: 'Monitoreo Docente EIB',
  DIRECTIVO: 'Monitoreo Directivo',
} as const;

/** Campos de la plantilla que la selección necesita. */
export interface PlantillaSeleccionable {
  id: string;
  tipoMonitoreo: string;
  estado: 'Vigente' | 'Borrador' | 'Historico';
  /** Sello histórico del autor. Ausente en plantillas anteriores al sello. */
  creadoPorRole?: RolAutorPlantilla;
  creadoPorId?: string;
  ieId?: string;
}

/** Quién evalúa y en qué contexto, que es lo que ordena las prioridades. */
export interface ContextoSeleccion {
  tipoVisita: keyof typeof TIPO_MONITOREO_POR_VISITA;
  usuarioId: string;
  /** Institución del usuario. Ausente para personal de la UGEL. */
  institucionUsuarioId?: string;
  /** ¿El usuario pertenece a una institución educativa? */
  esInstitucion: boolean;
  /** ¿El usuario levanta la ficha en el aula? */
  esMonitorCampo: boolean;
}

/**
 * Genérica en el tipo de plantilla para devolver el mismo objeto que recibe: la
 * selección sólo lee los campos de `PlantillaSeleccionable`, pero quien la llama
 * necesita la plantilla completa para renderizar la ficha.
 */
export function seleccionarPlantillaActiva<T extends PlantillaSeleccionable>(
  plantillas: readonly T[],
  contexto: ContextoSeleccion,
): T | null {
  const tipoBuscado = TIPO_MONITOREO_POR_VISITA[contexto.tipoVisita];
  const esCandidata = (p: T) => p.tipoMonitoreo === tipoBuscado && p.estado === 'Vigente';

  let elegida: T | undefined;

  if (contexto.esInstitucion && contexto.institucionUsuarioId) {
    // Prioridad 1: la que creó el PROPIO evaluador. Cualquier monitor de campo
    // del lado de la institución (director, coordinador pedagógico o jefe de
    // taller) puede tener su plantilla, y la suya gana sobre la de la I.E. Antes
    // sólo se reconocía `director_ie`, de modo que a un coordinador o jefe de
    // taller se le sugería por defecto la del director en vez de la propia.
    if (contexto.esMonitorCampo) {
      elegida = plantillas.find(
        (p) =>
          esCandidata(p) &&
          esAutorDeInstitucion(p.creadoPorRole) &&
          p.ieId === contexto.institucionUsuarioId &&
          p.creadoPorId === contexto.usuarioId,
      );
    }

    // Prioridad 2: la de su institución educativa (la del director de la I.E.).
    if (!elegida) {
      elegida = plantillas.find(
        (p) =>
          esCandidata(p) &&
          p.creadoPorRole === 'director_ie' &&
          p.ieId === contexto.institucionUsuarioId,
      );
    }
  }

  // Prioridad 3: la general de la UGEL. Sin autor sellado cuenta como UGEL.
  if (!elegida) {
    elegida = plantillas.find(
      (p) => esCandidata(p) && (!p.creadoPorRole || p.creadoPorRole === 'jefe_gestion'),
    );
  }

  // Cualquier vigente del tipo pedido. Si no hay ninguna, no hay instrumento:
  // antes se caía a `plantillas[0]` sin mirar tipo ni estado, y una visita a
  // docente podía evaluarse con el instrumento directivo o con un borrador sin
  // que nada lo delatara. Quedarse sin poder evaluar se ve y se corrige; los
  // datos levantados con el instrumento equivocado, no.
  return elegida ?? plantillas.find(esCandidata) ?? null;
}
