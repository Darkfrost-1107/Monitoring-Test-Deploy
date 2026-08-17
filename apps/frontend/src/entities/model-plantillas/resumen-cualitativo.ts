import type { NivelCalificacion, NivelRomano } from './model';

/**
 * Frecuencias de un instrumento que se responde por valoración, no por puntaje.
 *
 * ── Qué es un instrumento cualitativo ──
 * La Ficha Docente EIB es una lista de cotejo: cada ítem se marca Sí,
 * Parcialmente o No. Sumar esas marcas y dividirlas no significa nada, así que
 * su consolidado informa cuántos ítems cayeron en cada valoración en vez de un
 * nivel de logro.
 *
 * ── Por qué vive acá y no en el componente ──
 * El conteo estaba duplicado dentro de `ConsolidadoSeccion` (pantalla) y del
 * `Consolidado` de `CierreDeLaFicha` (documento impreso), y las dos copias
 * clasificaban por substring contra un vocabulario fijo de tres:
 *
 *     if (denom.includes('sí') || denom.includes('si')) countSi++;
 *     else if (denom.includes('parcial')) countParcial++;
 *     else if (denom.includes('no')) countNo++;
 *
 * La escala EIB declara **cuatro** niveles —No, Parcialmente, Sí y Destacado—.
 * «Destacado» no cae en ninguna rama: el ítem se perdía de los tres contadores
 * y la fila TOTAL del documento impreso seguía escribiendo 100% a mano. Las dos
 * copias además diferían en el respaldo de una denominación ausente, así que
 * contaban distinto sobre los mismos datos.
 *
 * De ahí la forma de esto: no hay vocabulario fijo. Se cuenta contra los
 * niveles que **la plantilla declara**, con su denominación y su color, y lo no
 * valorado va a su propio casillero. Una escala nueva no necesita tocar código.
 */

/** Vocabulario que delata una lista de cotejo en vez de una escala de puntaje. */
const DENOMINACIONES_CUALITATIVAS = ['sí', 'si', 'parcialmente', 'no'];

/**
 * Los niveles que el instrumento puede realmente otorgar.
 *
 * ── Por qué hay que filtrar ──
 * La escala EIB vigente ya declara sus tres valoraciones, así que para una
 * plantilla nueva esto no descarta nada. El filtro existe por las plantillas
 * **ya guardadas**: hasta que la cantidad de niveles pasó a declararse en el
 * contrato compartido, cinco validaciones exigían cuatro para todo instrumento y
 * la EIB llevaba un cuarto nivel inventado —«Destacado», con el mismo `rangoMin`
 * que «Sí»—. Esas plantillas siguen en la base con cuatro.
 *
 * Sin este filtro el consolidado de una de ellas mostraría una columna
 * «Destacado — 0 · 0%» en la pantalla y en el PDF oficial, informando un nivel
 * que el monitor nunca pudo marcar: `getOpcionesEib` lee sólo I, II y III.
 *
 * Es lo que permite no migrar la base de datos. `normalizarEscala` hace lo
 * equivalente del lado de la edición.
 *
 * El criterio no es la posición ni la cantidad: en una escala cualitativa una
 * valoración es la que el vocabulario reconoce. Un nivel de relleno no lo es.
 */
export function nivelesValorables(
  niveles: readonly NivelCalificacion[] | undefined,
): NivelCalificacion[] {
  return (niveles ?? []).filter((nivel) =>
    DENOMINACIONES_CUALITATIVAS.includes(nivel.denominacion.trim().toLowerCase()),
  );
}

/** Un nivel de la escala con cuántos ítems recibieron esa marca. */
export interface ConteoDeNivel {
  nivel: NivelRomano;
  denominacion: string;
  color: string;
  cantidad: number;
  porcentaje: number;
}

export interface ResumenCualitativo {
  /** Ítems evaluados por el instrumento, marcados o no. */
  total: number;
  /** Un conteo por nivel declarado, en el orden de la escala. */
  porNivel: ConteoDeNivel[];
  /** Los que quedaron sin marca, para que las cantidades cuadren con el total. */
  sinValorar: { cantidad: number; porcentaje: number };
}

/**
 * Si la escala de la plantilla se responde por valoración y no por puntaje.
 *
 * Decide por las denominaciones que la plantilla declara. Antes había además un
 * respaldo por cantidad —`desempenos.length > 10`— que no hacía falta para la
 * EIB, porque sus niveles ya dicen No / Parcialmente / Sí, y en cambio volvía
 * cualitativa a cualquier plantilla docente que llegara a once desempeños. Las
 * plantillas las arma el usuario en pantalla: ese umbral se disparaba solo.
 *
 * La comparación es exacta, no por substring: «En inicio» y «Logro destacado»
 * —niveles de las escalas docente y directiva— contienen esas letras sin ser
 * valoraciones.
 */
export function esEscalaCualitativa(niveles: readonly NivelCalificacion[] | undefined): boolean {
  return (niveles ?? []).some((nivel) =>
    DENOMINACIONES_CUALITATIVAS.includes(nivel.denominacion.trim().toLowerCase()),
  );
}

/**
 * Reparte los ítems evaluados entre los niveles que declara la escala.
 *
 * `idsEvaluados` son los ítems del instrumento y `nivelesElegidos` las marcas
 * que puso el monitor, indexadas por ese id. Un id sin entrada —o con un nivel
 * que no es una valoración otorgable— cuenta como sin valorar antes que
 * desaparecer.
 *
 * Sólo se informan los niveles de `nivelesValorables`: el relleno que exigen los
 * validadores de cuatro niveles no llega al consolidado.
 *
 * Los porcentajes se redondean por separado, de modo que pueden no sumar 100
 * exacto. Lo que sí es exacto son las cantidades: `porNivel` más `sinValorar`
 * siempre da `total`, que es lo que el documento oficial informa.
 */
export function resumirPorNivel(
  idsEvaluados: readonly string[],
  niveles: readonly NivelCalificacion[] | undefined,
  nivelesElegidos: Record<string, string>,
): ResumenCualitativo {
  const escala = nivelesValorables(niveles);
  const total = idsEvaluados.length;
  const porcentaje = (cantidad: number) =>
    total > 0 ? Math.round((cantidad / total) * 100) : 0;

  const cantidades = new Map<string, number>(escala.map((nivel) => [nivel.nivel, 0]));
  let sinValorar = 0;

  for (const id of idsEvaluados) {
    const romano = nivelesElegidos[id];
    const cantidad = romano === undefined ? undefined : cantidades.get(romano);

    if (cantidad === undefined) {
      sinValorar++;
      continue;
    }
    cantidades.set(romano, cantidad + 1);
  }

  return {
    total,
    porNivel: escala.map((nivel) => {
      const cantidad = cantidades.get(nivel.nivel) ?? 0;
      return {
        nivel: nivel.nivel,
        denominacion: nivel.denominacion,
        color: nivel.color,
        cantidad,
        porcentaje: porcentaje(cantidad),
      };
    }),
    sinValorar: { cantidad: sinValorar, porcentaje: porcentaje(sinValorar) },
  };
}
