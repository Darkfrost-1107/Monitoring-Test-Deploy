import { MODALIDAD_NIVEL_MAP, ModalidadEducativa } from '@sistema-monitoreo/shared-contracts';
import type { IUgelDashboardDistrito, IUgelDashboardIeMapa } from '@sistema-monitoreo/shared-contracts';
import { normDistrito } from '@shared/lib/distrito';

/**
 * Lo que el mapa de Lampa decide antes de dibujar.
 *
 * Vivía dentro de `LampaMap`, entre la geometría de la provincia y la
 * maquetación de la leyenda: qué color lleva cada distrito según su cobertura,
 * qué instituciones quedan a la vista y qué filtros tiene sentido ofrecer.
 */

/** Valor con el que un filtro se declara inactivo. */
export const TODOS = 'Todos';

/** El Director UGEL supervisa cobertura por distrito. */
export const MODO_DISTRITAL = 'distrital';

/** Jefe de Gestión, Jefe de Área y Especialista trabajan el detalle por IE. */
export const MODO_INSTITUCIONAL = 'institucional';

export type ModoDelMapa = typeof MODO_DISTRITAL | typeof MODO_INSTITUCIONAL;

/** Color y etiqueta de cada estado del semáforo institucional. */
export const ESTADOS_DEL_MAPA = {
  critico: { key: 'critico', color: '#ef4444', label: 'Crítico' },
  enProceso: { key: 'enProceso', color: '#f59e0b', label: 'En proceso' },
  logroPrevisto: { key: 'logroPrevisto', color: '#22c55e', label: 'Logro previsto' },
  sinRegistro: { key: 'sinRegistro', color: '#94a3b8', label: 'Sin registro' },
} as const;

export type EstadoDelMapa = (typeof ESTADOS_DEL_MAPA)[keyof typeof ESTADOS_DEL_MAPA];

/**
 * Leyenda del coroplético distrital.
 *
 * El orden importa: `colorDeCobertura` lee sus umbrales de acá, así que lo que
 * se dibuja y lo que se anuncia no pueden separarse.
 */
export const COBERTURA_LEYENDA = [
  { desde: 75, color: '#22c55e', label: 'Cobertura ≥ 75%' },
  { desde: 40, color: '#f59e0b', label: 'Cobertura 40–74%' },
  { desde: 0, color: '#ef4444', label: 'Cobertura < 40%' },
  { desde: null, color: '#94a3b8', label: 'Sin registro' },
] as const;

/** Lo que hace falta saber de una II.EE. para filtrarla por modalidad y nivel. */
type ConNivel = Pick<IUgelDashboardIeMapa, 'modalidad' | 'nivelEducativo'>;

/**
 * El filtro por nivel se elige en cascada: modalidad y después nivel.
 *
 * Antes eran sólo tres botones —Inicial, Primaria y Secundaria—, así que las
 * II.EE. de EBA, EBE y CEPTRO se veían en el mapa y ningún botón las alcanzaba.
 * El nivel sólo se entiende dentro de su modalidad, igual que al programar un
 * cronograma.
 */
export interface FiltroDeNivel {
  modalidad: string;
  nivel: string;
}

export const SIN_FILTRO_DE_NIVEL: FiltroDeNivel = { modalidad: TODOS, nivel: TODOS };

/** Nombre completo, para acompañar al código que dice el botón. */
export const NOMBRE_DE_MODALIDAD: Record<string, string> = {
  [ModalidadEducativa.EBR]: 'Educación Básica Regular',
  [ModalidadEducativa.EBA]: 'Educación Básica Alternativa',
  [ModalidadEducativa.EBE]: 'Educación Básica Especial',
  [ModalidadEducativa.CEPTRO]: 'Centro de Educación Técnico-Productiva',
};

const MODALIDADES_DEL_DOMINIO = Object.keys(MODALIDAD_NIVEL_MAP);

/**
 * Lo que hay, primero en el orden del dominio y después lo que el dominio no
 * conoce: un dato raro en la base no puede volver inalcanzable a una II.EE.
 */
function enOrdenDelDominio(presentes: Iterable<string>, delDominio: readonly string[]): string[] {
  const hay = new Set(presentes);
  const conocidos = delDominio.filter((valor) => hay.has(valor));
  const desconocidos = [...hay]
    .filter((valor) => !delDominio.includes(valor))
    .sort((a, b) => a.localeCompare(b, 'es'));
  return [...conocidos, ...desconocidos];
}

interface OpcionesDelFiltro {
  /**
   * Ofrecer todo lo que el dominio define y no sólo lo que hay en los datos.
   *
   * Es para quien ve toda la provincia: EBE tiene dos niveles, CEBE y PRITE, y
   * hoy sólo hay II.EE. de CEBE; sin esto PRITE no se ofrecía y parecía que EBE
   * tenía uno solo. Quien recibe un alcance acotado no lo activa: un
   * especialista sólo tiene su nivel, y ofrecerle los otros sería darle botones
   * que dejan el mapa vacío.
   */
  delDominio?: boolean;
}

/** Modalidades que se ofrecen, en el orden del dominio. */
export function modalidadesDisponibles(
  instituciones: readonly ConNivel[],
  { delDominio = false }: OpcionesDelFiltro = {},
): string[] {
  const presentes = instituciones.map((ie) => ie.modalidad);
  return enOrdenDelDominio(
    delDominio ? [...MODALIDADES_DEL_DOMINIO, ...presentes] : presentes,
    MODALIDADES_DEL_DOMINIO,
  );
}

/** Niveles que se ofrecen dentro de una modalidad, en el orden del dominio. */
export function nivelesDisponibles(
  instituciones: readonly ConNivel[],
  modalidad: string,
  { delDominio = false }: OpcionesDelFiltro = {},
): string[] {
  const delaModalidad = MODALIDAD_NIVEL_MAP[modalidad] ?? [];
  const presentes = instituciones
    .filter((ie) => ie.modalidad === modalidad)
    .map((ie) => ie.nivelEducativo);
  return enOrdenDelDominio(delDominio ? [...delaModalidad, ...presentes] : presentes, delaModalidad);
}

/**
 * Niveles que el filtro ofrece según la modalidad elegida.
 *
 * Con varias modalidades a la vista un nivel suelto no dice de cuál es, así que
 * no se ofrece hasta que se elige una. Con una sola —el especialista sólo recibe
 * la suya— se ofrecen de una vez: obligarlo a elegirla sería un clic de más.
 */
export function nivelesDelFiltro(
  instituciones: readonly ConNivel[],
  modalidad: string,
  opciones: OpcionesDelFiltro = {},
): string[] {
  if (modalidad !== TODOS) return nivelesDisponibles(instituciones, modalidad, opciones);

  const modalidades = modalidadesDisponibles(instituciones, opciones);
  return modalidades.length === 1
    ? nivelesDisponibles(instituciones, modalidades[0], opciones)
    : [];
}

/**
 * ¿La II.EE. entra en el recorte que el filtro describe?
 *
 * El mapa y la lista de al lado tienen que usar esta misma regla: si cada uno
 * comparara a su manera, elegir un nivel mostraría dos vistas del mismo recorte
 * con cosas distintas.
 */
export function coincideConFiltroDeNivel(ie: ConNivel, { modalidad, nivel }: FiltroDeNivel): boolean {
  if (modalidad !== TODOS && ie.modalidad !== modalidad) return false;
  if (nivel !== TODOS && ie.nivelEducativo !== nivel) return false;
  return true;
}

/**
 * Nivel tal como se lee en una tarjeta o un globo.
 *
 * En EBR alcanza con el nivel, que es lo que siempre se mostró. En las demás
 * «CEBE» o «Avanzado» solos no dicen a qué modalidad pertenecen.
 */
export function etiquetaDeNivel(ie: ConNivel): string {
  return ie.modalidad === ModalidadEducativa.EBR
    ? ie.nivelEducativo
    : `${ie.modalidad} · ${ie.nivelEducativo}`;
}

export const DISTRITOS_DE_LAMPA = [
  'CABANILLA',
  'CALAPUJA',
  'LAMPA',
  'NICASIO',
  'OCUVIRI',
  'PALCA',
  'PARATIA',
  'PUCARA',
  'SANTA LUCIA',
  'VILAVILA',
] as const;

/**
 * Obtiene la lista de nombres de distritos presentes en las instituciones o cobertura,
 * ordenados alfabéticamente.
 */
export function extraerDistritos(
  instituciones: readonly IUgelDashboardIeMapa[],
  cobertura?: readonly IUgelDashboardDistrito[],
): string[] {
  const mapa = new Map<string, string>();
  for (const c of cobertura ?? []) {
    if (c.distrito) {
      mapa.set(normDistrito(c.distrito), c.distrito);
    }
  }
  for (const ie of instituciones) {
    if (ie.distrito) {
      const key = normDistrito(ie.distrito);
      if (!mapa.has(key)) {
        mapa.set(key, ie.distrito);
      }
    }
  }
  if (mapa.size === 0) {
    return [...DISTRITOS_DE_LAMPA];
  }
  return Array.from(mapa.values()).sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Color del distrito según su cobertura, o el de «sin registro» si no se midió.
 *
 * Un distrito sin datos y uno con 0% no son lo mismo: el primero no se midió,
 * el segundo se midió y dio cero. Por eso la ausencia se pasa como nula y no
 * como cero.
 */
export function colorDeCobertura(porcentaje: number | null | undefined): string {
  if (porcentaje == null) return COBERTURA_LEYENDA[3].color;

  const tramo = COBERTURA_LEYENDA.find((t) => t.desde != null && porcentaje >= t.desde);
  return (tramo ?? COBERTURA_LEYENDA[3]).color;
}

/** Color y etiqueta del marcador de una IE. */
export function estadoDelMarcador(estado: string): EstadoDelMapa {
  return (
    (ESTADOS_DEL_MAPA as Record<string, EstadoDelMapa | undefined>)[estado] ??
    ESTADOS_DEL_MAPA.sinRegistro
  );
}

interface FiltrosDelMapa {
  /** Nombre del distrito seleccionado, tal como se muestra. */
  distrito?: string | null;
  modalidad?: string;
  nivel?: string;
  estado?: string;
}

/** II.EE. que quedan a la vista con los filtros puestos. */
export function institucionesVisibles(
  instituciones: readonly IUgelDashboardIeMapa[],
  { distrito, modalidad = TODOS, nivel = TODOS, estado }: FiltrosDelMapa,
): IUgelDashboardIeMapa[] {
  const distritoNorm = distrito ? normDistrito(distrito) : null;

  return instituciones.filter((ie) => {
    if (distritoNorm && normDistrito(ie.distrito) !== distritoNorm) return false;
    if (!coincideConFiltroDeNivel(ie, { modalidad, nivel })) return false;
    if (estado && estado !== TODOS && ie.estado !== estado) return false;
    return true;
  });
}

interface RecorteDeConteo {
  distrito?: string | null;
  modalidad?: string;
  nivel?: string;
}

/**
 * Cuántas II.EE. hay en cada estado del semáforo dentro del recorte.
 *
 * El propio estado no filtra: la leyenda cuenta con esto para elegirlo, y un
 * conteo que ya lo excluyera mostraría cero en todos menos en el elegido.
 */
export function conteoPorEstado(
  instituciones: readonly IUgelDashboardIeMapa[],
  { distrito, modalidad, nivel }: RecorteDeConteo,
): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const ie of institucionesVisibles(instituciones, { distrito, modalidad, nivel })) {
    conteo[ie.estado] = (conteo[ie.estado] ?? 0) + 1;
  }
  return conteo;
}

/** Cuántas II.EE. hay en cada distrito dentro del recorte, con el nombre en mayúsculas como clave. */
export function conteoPorDistrito(
  instituciones: readonly IUgelDashboardIeMapa[],
  { modalidad, nivel }: Omit<RecorteDeConteo, 'distrito'>,
): Map<string, number> {
  const conteo = new Map<string, number>();
  for (const ie of institucionesVisibles(instituciones, { modalidad, nivel })) {
    if (!ie.distrito) continue;
    const clave = ie.distrito.toUpperCase();
    conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
  }
  return conteo;
}

/**
 * Cobertura de cada distrito dentro del recorte de modalidad y nivel.
 *
 * El backend manda la cobertura abierta por modalidad y nivel: sumar sólo las
 * filas que el filtro deja pasar da la cifra que habría calculado con ese
 * filtro, incluidas las II.EE. sin coordenadas que el mapa no dibuja. Un
 * distrito sin II.EE. en el recorte queda fuera —no tiene 0 % de cobertura, no
 * tiene qué cubrir— y el mapa lo pinta como «sin datos».
 *
 * `nivelPromedio` no se recalcula: el desglose no lo trae y ningún filtro lo usa.
 */
export function coberturaSegunFiltro(
  cobertura: readonly IUgelDashboardDistrito[],
  { modalidad, nivel }: FiltroDeNivel,
): IUgelDashboardDistrito[] {
  if (!cobertura || (modalidad === TODOS && nivel === TODOS)) return [...(cobertura ?? [])];

  return cobertura.flatMap((distrito) => {
    if (!distrito.desglose || distrito.desglose.length === 0) {
      return [distrito];
    }
    const filas = (distrito.desglose ?? []).filter((fila) =>
      coincideConFiltroDeNivel(fila, { modalidad, nivel }),
    );
    const total = filas.reduce((suma, fila) => suma + fila.totalInstituciones, 0);
    if (total === 0) return [];

    const monitoreadas = filas.reduce((suma, fila) => suma + fila.monitoreadas, 0);
    return [
      {
        ...distrito,
        totalInstituciones: total,
        monitoreadas,
        porcentajeCobertura: Math.round((monitoreadas / total) * 100),
        desglose: filas,
      },
    ];
  });
}

/**
 * Huella de los datos de cobertura, para forzar el remonte de la capa GeoJSON.
 *
 * `onEachFeature` de react-leaflet corre una sola vez, al crear la capa: los
 * tooltips conservan los porcentajes con los que se montaron. El estilo sí se
 * actualiza —`updateGeoJSON` llama a `setStyle` cuando cambia la referencia de
 * `style`—, así que sin esto los colores dicen una cosa y el tooltip otra.
 */
export function firmaDeCobertura(distritos: readonly IUgelDashboardDistrito[]): string {
  return distritos
    .map((d) => `${d.distrito}:${d.porcentajeCobertura}:${d.monitoreadas}/${d.totalInstituciones}`)
    .join('|');
}
