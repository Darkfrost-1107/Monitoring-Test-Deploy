import { nombreDePlantilla } from '@entities/model-plantillas';
import { etiquetaDeAutor } from '@features/plantillas/lib/autor-de-plantilla';
import type { RolAutorPlantilla, TipoPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Qué rúbricas propias de la institución se pueden analizar.
 *
 * ── Por qué esto dejó de poder agruparse por cargo ──
 * Antes había una píldora por cargo —Dirección, Coordinador P., Jefe de Taller—
 * y se daba por hecho que cada cargo tenía a lo sumo una ficha. Desde que el
 * cupo se aprueba a nombre de una PERSONA, una I.E. puede tener dos
 * coordinadores pedagógicos con una ficha cada uno, distintas entre sí: distintos
 * criterios, distinta escala, distinta área.
 *
 * Agrupadas por cargo, las dos caían en la misma píldora con el mismo rótulo. Y
 * ése es el peor error que puede cometer esta pantalla: elegir la rúbrica
 * equivocada no da ningún aviso, sólo un gráfico con números que parecen buenos
 * y describen otra cosa.
 *
 * Acá cada rúbrica es UNA plantilla concreta, rotulada con el nombre que le puso
 * quien la creó.
 *
 * ── Por qué ya no hay píldoras en cero ──
 * Se mostraban los tres cargos siempre, aunque no existiera ninguna ficha, «para
 * que el cliente vea el juego completo». Eso tenía sentido cuando los tres
 * cargos eran una taxonomía fija; hoy una institución puede no tener ninguna
 * ficha propia en todo el año, y tres píldoras en cero prometen una estructura
 * que no existe. En su lugar se dice, en una línea, qué falta y dónde se
 * resuelve.
 *
 * ── Por qué la lista es siempre de UNA institución ──
 * Quien mira desde la UGEL tiene 300 colegios; si un tercio tuviera ficha
 * propia, la fila de píldoras traería cien botones y dejaría de ser un filtro.
 * Además, dos rúbricas de colegios distintos no se comparan entre sí: no hay
 * nada que ganar viéndolas juntas. La institución se elige antes, en el filtro
 * que ya existe, y esta lista describe sólo la elegida.
 */

/** Los campos de la plantilla que la decisión necesita. */
export interface PlantillaAnalizable {
  id: string;
  instrumento: TipoPlantilla;
  /** Número de versión. Distingue dos revisiones del mismo instrumento. */
  version?: number;
  estado?: 'Borrador' | 'Vigente' | 'Historico';
  descripcion?: string;
  tipoMonitoreo: string;
  anioAcademico: number;
  /** Institución dueña. Ausente en las de la UGEL. */
  ieId?: string;
  creadoPorRole?: RolAutorPlantilla;
  autorNombre?: string;
}

/** Una rúbrica que se puede elegir en el filtro. */
export interface RubricaElegible {
  id: string;
  /** Rótulo de la píldora. Único dentro del grupo. */
  label: string;
  /** Detalle completo, para el tooltip y la línea de selección. */
  titulo: string;
  /** Nombre de quien la creó, o el cargo si la plantilla no lo trae. */
  autor: string;
  conteo: number;
}

/** Por qué el grupo institucional está vacío, si lo está. */
export type MotivoSinRubricas =
  /** La institución no tiene ninguna ficha propia autorizada. */
  | 'SIN_PLANTILLAS'
  /** Tiene fichas propias, pero todavía nadie monitoreó con ellas. */
  | 'SIN_FICHAS';

export interface RubricasInstitucionales {
  rubricas: RubricaElegible[];
  /** `null` cuando hay al menos una rúbrica analizable. */
  motivoVacio: MotivoSinRubricas | null;
}

/**
 * Nombre corto de quien creó la ficha.
 *
 * Los nombres del padrón vienen completos —«ROSMINDA MAMANI HILASACA»— y no
 * entran en una píldora. Se toman el nombre y el primer apellido, que es como se
 * la nombra en la institución.
 */
const nombreCorto = (completo: string): string =>
  completo.trim().split(/\s+/).slice(0, 2).join(' ');

const ROTULO_INSTRUMENTO: Record<string, string> = {
  DOCENTE: 'Docente',
  DOCENTE_EIB: 'Docente EIB',
  DIRECTIVO: 'Directivo',
};

/**
 * Las rúbricas propias de la institución que tienen fichas para analizar.
 *
 * @param plantillas catálogo visible para esta persona.
 * @param conteoPorPlantilla fichas por plantilla, YA acotadas por los filtros de
 *   ámbito. Una rúbrica sin fichas en el ámbito elegido no se ofrece: se
 *   seleccionaría y el gráfico saldría vacío, sin decir por qué.
 */
export function rubricasInstitucionales(
  plantillas: readonly PlantillaAnalizable[],
  conteoPorPlantilla: ReadonlyMap<string, number>,
): RubricasInstitucionales {
  const propias = plantillas.filter((p) => p.ieId !== undefined);
  if (propias.length === 0) {
    return { rubricas: [], motivoVacio: 'SIN_PLANTILLAS' };
  }

  const conFichas = propias.filter((p) => (conteoPorPlantilla.get(p.id) ?? 0) > 0);
  if (conFichas.length === 0) {
    return { rubricas: [], motivoVacio: 'SIN_FICHAS' };
  }

  const nombres = conFichas.map((p) => nombreDePlantilla(p));
  // Cuántas veces se repite cada nombre: sólo se desambigua lo que hace falta.
  const repetido = new Map<string, number>();
  nombres.forEach((n) => repetido.set(n, (repetido.get(n) ?? 0) + 1));

  const rubricas = conFichas.map((p, i) => {
    const nombre = nombres[i]!;
    const cargo = etiquetaDeAutor(p.creadoPorRole);
    const autor = p.autorNombre ? nombreCorto(p.autorNombre) : cargo;
    const instrumento = ROTULO_INSTRUMENTO[p.instrumento] ?? p.instrumento;

    return {
      id: p.id,
      /**
       * El autor sólo entra en el rótulo cuando dos fichas se llaman igual.
       * Agregarlo siempre alargaría la píldora sin necesidad; no agregarlo nunca
       * deja dos botones idénticos que analizan cosas distintas.
       *
       * El colegio NO va acá: esta lista corresponde siempre a UNA institución
       * —quien mira desde la UGEL la elige antes—, así que nombrarlo en cada
       * píldora repetiría lo que el filtro ya dice.
       */
      label: (repetido.get(nombre) ?? 0) > 1 ? `${nombre} · ${autor}` : nombre,
      titulo: `${nombre} — ${autor} · ${cargo} · Ficha ${instrumento}`,
      autor,
      conteo: conteoPorPlantilla.get(p.id) ?? 0,
    };
  });

  // Las más usadas primero: es el orden en que se las va a buscar. A igual
  // cantidad, alfabético, para que la lista no baile entre recargas.
  return {
    rubricas: rubricas.sort(
      (a, b) => b.conteo - a.conteo || a.label.localeCompare(b.label, 'es'),
    ),
    motivoVacio: null,
  };
}

/**
 * Las rúbricas del catálogo oficial de la UGEL, una píldora por instrumento.
 *
 * ── Por qué no alcanza con la vigente ──
 * Se tomaba la plantilla VIGENTE de cada instrumento y se contaba sobre ella.
 * Pero versionar una plantilla archiva la anterior y las fichas ya levantadas
 * se quedan en la vieja: una institución cuya única visita se evaluó con la v1
 * veía «Docente 0» y, sin embargo, la pantalla analizaba esa ficha igual, porque
 * la selección caía por defecto en la plantilla con más fichas —la v1— que ni
 * siquiera figuraba entre las píldoras. Ninguna quedaba resaltada y los tres
 * conteos decían cero mientras arriba se leía «1 monitoreo analizado».
 *
 * No se suman las versiones: son rúbricas distintas. Versionar puede agregar,
 * quitar o reescribir desempeños, y promediar criterios que no son los mismos
 * produce un número que no significa nada. Cada versión con fichas es su propia
 * píldora.
 *
 * La vigente se ofrece siempre, aunque esté en cero: es la que se va a usar en
 * la próxima visita y su ausencia se leería como que falta el instrumento.
 */
export function rubricasDeLaUgel(
  plantillas: readonly PlantillaAnalizable[],
  conteoPorPlantilla: ReadonlyMap<string, number>,
  instrumentos: readonly TipoPlantilla[],
): RubricaElegible[] {
  const deLaUgel = plantillas.filter((p) => p.ieId === undefined);

  return instrumentos.flatMap((instrumento) => {
    const delInstrumento = deLaUgel.filter((p) => p.instrumento === instrumento);
    const vigente = delInstrumento.find((p) => p.estado === 'Vigente');
    const conFichas = delInstrumento.filter((p) => (conteoPorPlantilla.get(p.id) ?? 0) > 0);

    const elegidas = [...conFichas];
    if (vigente && !elegidas.some((p) => p.id === vigente.id)) elegidas.push(vigente);

    const rotulo = ROTULO_INSTRUMENTO[instrumento] ?? instrumento;

    // Sin ninguna plantilla cargada la píldora igual se muestra, en cero: el
    // catálogo oficial son tres fichas y su ausencia se leería como una falla.
    if (elegidas.length === 0) {
      return [{ id: `ugel:${instrumento}`, label: rotulo, titulo: rotulo, autor: 'UGEL', conteo: 0 }];
    }

    // La versión sólo entra en el rótulo cuando hay más de una en juego:
    // «Docente» a secas es lo normal y lo que el cliente espera leer.
    const varias = elegidas.length > 1;

    // La más reciente primero: es la que rige y la que se busca antes.
    return [...elegidas]
      .sort((a, b) => (b.version ?? 1) - (a.version ?? 1))
      .map((p) => {
        const version = p.version ?? 1;
        const estado = p.estado === 'Vigente' ? 'vigente' : 'versión anterior';
        return {
          id: p.id,
          label: varias ? `${rotulo} · v${version}` : rotulo,
          titulo: `Ficha oficial de la UGEL · ${rotulo} · v${version} (${estado})`,
          autor: 'UGEL',
          conteo: conteoPorPlantilla.get(p.id) ?? 0,
        };
      });
  });
}
