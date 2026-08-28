import type { TipoPlantilla } from '../plantillas/plantilla.contract.js';

/**
 * Solicitudes de plantilla — contrato compartido.
 *
 * El catálogo oficial son las tres fichas de la UGEL: Docente, Docente EIB y
 * Directivo. Una institución que necesita un instrumento propio ya no lo crea
 * por su cuenta: lo pide antes, con un PDF que lo justifica, y el Jefe de
 * Gestión aprueba o rechaza el pedido completo.
 *
 * ── Por qué el pedido lleva ítems y no un texto ──
 * Aprobar «necesitamos fichas para los talleres» no restringe nada: la
 * institución construiría después lo que quisiera. Cada ítem aprobado es un
 * vale con instrumento, cargo destinatario y año, y el sistema verifica que la
 * plantilla creada coincida antes de consumirlo. La aprobación deja de ser un
 * papel y pasa a ser una restricción que el servidor hace cumplir.
 */

/** Instrumentos que una institución puede pedir. La ficha directiva es sólo del especialista. */
export const INSTRUMENTOS_SOLICITABLES: readonly TipoPlantilla[] = ['DOCENTE', 'DOCENTE_EIB'];

/** Cargos de institución a los que puede servir una plantilla propia. */
export const CargoBeneficiario = {
  DIRECTOR: 'Director',
  JEFE_DE_TALLER: 'Jefe de Taller',
  COORDINADOR_PEDAGOGICO: 'Coordinador Pedagógico',
} as const;
export type CargoBeneficiario = (typeof CargoBeneficiario)[keyof typeof CargoBeneficiario];

export const ESTADOS_SOLICITUD_PLANTILLA = ['PENDIENTE', 'APROBADA', 'RECHAZADA'] as const;
export type EstadoSolicitudPlantilla = (typeof ESTADOS_SOLICITUD_PLANTILLA)[number];

/**
 * Una plantilla pedida dentro de una solicitud.
 *
 * Mientras la solicitud está aprobada y `plantillaId` es `null`, el ítem es un
 * vale libre: habilita crear UNA plantilla de ese instrumento para ese cargo.
 */
export interface ISolicitudPlantillaItem {
  id: string;
  instrumento: TipoPlantilla;
  cargoBeneficiario: CargoBeneficiario;
  descripcion: string;
  /**
   * Persona a la que se destina la plantilla. Sólo ella podrá crearla.
   *
   * `null` en los vales anteriores a este campo, que siguen valiendo para
   * cualquiera de su cargo.
   */
  beneficiarioId: string | null;
  /** Nombre del destinatario, para mostrarlo sin otra consulta. */
  beneficiarioNombre: string | null;
  /** Plantilla creada al amparo del vale. `null` mientras está libre. */
  plantillaId: string | null;
}

export interface ISolicitudPlantilla {
  id: string;
  institucionId: string;
  institucionNombre: string;
  /** Director de la I.E. que firmó el pedido. */
  solicitante: string;
  anioEscolar: number;
  /** PDF con la justificación, para que el Jefe de Gestión lo lea antes de decidir. */
  justificacionUrl: string;
  estado: EstadoSolicitudPlantilla;
  /** Motivo del rechazo o nota de la aprobación. */
  comentario: string | null;
  resueltaPor: string | null;
  resueltaAt: string | null;
  createdAt: string;
  items: ISolicitudPlantillaItem[];
}

/** Alta del pedido. El PDF viaja aparte, como archivo. */
export interface ICrearSolicitudPlantillaRequest {
  anioEscolar: number;
  items: {
    instrumento: TipoPlantilla;
    cargoBeneficiario: CargoBeneficiario;
    /**
     * Usuario al que se destina la plantilla.
     *
     * El cargo no alcanza: una I.E. puede tener dos coordinadores pedagógicos, y
     * un vale por cargo lo consume el primero que entre. El director elige a la
     * persona de una lista, así que su institución debe tener el personal
     * registrado antes de pedir.
     */
    beneficiarioId: string;
    descripcion: string;
  }[];
}

/** Decisión del Jefe de Gestión sobre el pedido completo. */
export interface IResolverSolicitudPlantillaRequest {
  comentario?: string;
}

export interface ISolicitudesPlantillaResponse {
  solicitudes: ISolicitudPlantilla[];
  pendientes: number;
}

/**
 * Vale libre que la institución puede usar para crear una plantilla.
 *
 * La pantalla de creación los ofrece y el servidor los verifica: sin vale, la
 * creación se rechaza en el backend, no ocultando un botón.
 */
export interface IValeDisponible {
  itemId: string;
  instrumento: TipoPlantilla;
  cargoBeneficiario: CargoBeneficiario;
  descripcion: string;
  anioEscolar: number;
}

/**
 * Persona de la institución que puede recibir un vale de plantilla.
 *
 * Es la lista que el director elige al armar la solicitud. Sale de los usuarios
 * registrados de su I.E.: quien no está en el padrón no puede ser destinatario,
 * y eso obliga a ordenar el registro antes de pedir.
 */
export interface IDestinatarioDeVale {
  usuarioId: string;
  nombre: string;
  cargo: CargoBeneficiario;
}
