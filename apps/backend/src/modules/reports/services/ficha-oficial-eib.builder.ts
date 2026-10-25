import {
  construirFichaOficialDocente,
  type FichaOficialDocente,
  type FichaOficialRaw,
} from './ficha-oficial-docente.builder.js';

/** Valoración de un ítem de la lista de cotejo. `null` es un ítem sin valorar. */
export type ValorEib = 'si' | 'parcial' | 'no' | null;

export interface ItemEib {
  texto: string;
  valor: ValorEib;
  observacion: string;
}

export interface SubcriterioEib {
  /** Vacío cuando la sección no se subdivide. */
  titulo: string;
  items: ItemEib[];
}

export interface BloqueEib {
  seccion: string;
  /** Observación en aula (parte 5 del formulario) o revisión de documentos (parte 6). */
  tipo: 'AULA' | 'DOCUMENTAL';
  subcriterios: SubcriterioEib[];
}

export interface FichaOficialEib {
  titulo: string;
  anio: number;
  lema: string | null;
  ie: {
    nombre: string;
    codigoModular: string;
    lugar: string;
    distrito: string;
    provincia: string;
    region: string;
    formaDeAtencion: string;
  };
  docente: { nombre: string; codigoModular: string; dni: string };
  fecha: string;
  horaInicio: string;
  horaFinal: string;
  planificacion: {
    nombre: string;
    duracion: string;
    sesion: string;
    competencias: string;
    area: string;
  };
  bloques: BloqueEib[];
  fortalezas: string;
  aspectosAMejorar: string;
  observacionesGenerales: string;
  compromisoDelDocente: string;
  compromisoDelEspecialista: string;
  firmasEib: { rol: string; imagen: string | null }[];
  evidencias: string[];
}

/** Donde cae un ítem que no declara su sección, igual que en la pantalla de llenado. */
const SECCION_POR_DEFECTO = 'I. CONDICIONES BÁSICAS PARA EL APRENDIZAJE';

const VALOR_POR_NIVEL: Record<number, ValorEib> = { 1: 'no', 2: 'parcial', 3: 'si' };

/**
 * La plantilla guarda «Sección — Subcriterio» en `descripcionCorta`. Se aceptan los tres
 * separadores que ya entiende la pantalla de llenado: raya larga, salto de línea y guion.
 */
function separarSeccion(descripcionCorta: string | null): { seccion: string; subcriterio: string } {
  const texto = descripcionCorta?.trim() || SECCION_POR_DEFECTO;
  const [seccion, ...resto] = texto.split(/ — |\n| - /);
  return { seccion: seccion.trim(), subcriterio: resto.join(' — ').trim() };
}

/** La sección III es la revisión de documentos; las demás, observación en aula. */
const esDocumental = (seccion: string): boolean =>
  /^III\b/i.test(seccion) || /PLANIFICACI[ÓO]N CURRICULAR|REVISI[ÓO]N DE DOCUMENTOS/i.test(seccion);

function construirBloques(raw: FichaOficialRaw): BloqueEib[] {
  const respuestas = new Map(raw.respuestasDesempeno.map((r) => [r.desempenoId, r]));
  const items = [...raw.plantilla.desempenos].sort((a, b) => a.orden - b.orden);

  const porSeccion = new Map<string, Map<string, ItemEib[]>>();

  for (const d of items) {
    const { seccion, subcriterio } = separarSeccion(d.descripcionCorta);
    const respuesta = respuestas.get(d.id);

    const subcriterios = porSeccion.get(seccion) ?? new Map<string, ItemEib[]>();
    porSeccion.set(seccion, subcriterios);
    const lista = subcriterios.get(subcriterio) ?? [];
    subcriterios.set(subcriterio, lista);

    lista.push({
      texto: d.nombre,
      valor: respuesta ? (VALOR_POR_NIVEL[respuesta.nivel] ?? null) : null,
      observacion: respuesta?.observaciones ?? '',
    });
  }

  return [...porSeccion.entries()].map(([seccion, subcriterios]) => ({
    seccion,
    tipo: esDocumental(seccion) ? 'DOCUMENTAL' : 'AULA',
    subcriterios: [...subcriterios.entries()].map(([titulo, lista]) => ({ titulo, items: lista })),
  }));
}

const imagenDeFirma = (base: FichaOficialDocente, rol: string): string | null =>
  base.firmas.find((f) => f.rol === rol)?.imagen ?? null;

/**
 * Ficha oficial de observación en aula para II. EE. EIB.
 *
 * Es una lista de cotejo: cada ítem se valora Sí, Parcialmente o No (3, 2 y 1). Lo que
 * el formulario pide y el sistema no captura —estadística por grado, nombre de la
 * planificación, tiempo de servicios…— queda en blanco, como en el formulario en papel,
 * y se completa a mano. Los cierres se corresponden así: lo sugerido son los «aspectos a
 * mejorar» y los compromisos son los del docente. Las observaciones generales no tienen
 * lugar en el formulario y se imprimen aparte; «fortalezas» y el compromiso del
 * especialista no se capturan y quedan vacíos, en vez de rotular como fortaleza algo que
 * no lo es.
 */
export function construirFichaOficialEib(raw: FichaOficialRaw): FichaOficialEib {
  const base = construirFichaOficialDocente(raw);
  const institucion = raw.cronograma.institucion;

  return {
    titulo: `Ficha de observación en aula para II. EE. EIB – ${institucion.nivelEducativo}`,
    anio: base.anio,
    lema: base.lema,
    ie: {
      nombre: institucion.nombre,
      codigoModular: institucion.codigoModular,
      lugar: institucion.direccion,
      distrito: institucion.distrito,
      provincia: institucion.provincia,
      region: institucion.departamento,
      formaDeAtencion: '',
    },
    docente: { nombre: base.docente.nombre, codigoModular: '', dni: base.docente.dni },
    fecha: base.fecha,
    horaInicio: base.horaInicio,
    horaFinal: base.horaFinal,
    planificacion: {
      nombre: '',
      duracion: '',
      sesion: '',
      competencias: '',
      area: base.docente.area,
    },
    bloques: construirBloques(raw),
    fortalezas: '',
    aspectosAMejorar: base.sugerencias,
    observacionesGenerales: base.observaciones,
    compromisoDelDocente: base.compromisos,
    compromisoDelEspecialista: '',
    firmasEib: [
      { rol: 'Docente de aula', imagen: imagenDeFirma(base, 'Docente') },
      { rol: 'Especialista de UGEL', imagen: imagenDeFirma(base, 'Monitor') },
      { rol: 'Director de la IE.', imagen: null },
    ],
    evidencias: base.evidencias,
  };
}
