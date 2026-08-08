/**
 * Lo que la pantalla de auditoría muestra de cada desempeño.
 *
 * Vivía dentro de `FichaAuditorModal`, entre la maquetación de la lista
 * lateral.
 *
 * ── Por qué no hay valores por omisión ──
 * La lista mostraba `Nivel {selectedLevel || 'III'}`: un desempeño sin
 * calificar aparecía como Nivel III —logro esperado— y con la marca de
 * verificado al lado, que se dibujaba sin condición alguna. Es la pantalla que
 * existe para comprobar qué se registró: es el último lugar donde conviene
 * rellenar un hueco.
 */

export interface DesempenoAuditable {
  id: string;
  nombre: string;
}

export interface DesempenoAuditado extends DesempenoAuditable {
  /** Posición en la plantilla, empezando en 1. */
  orden: number;
  /** Nivel registrado, o nulo si nadie lo calificó. */
  nivel: string | null;
  calificado: boolean;
}

export function desempenosAuditados(
  desempenos: readonly DesempenoAuditable[],
  nivelesElegidos: Readonly<Record<string, string>>,
): DesempenoAuditado[] {
  return desempenos.map((desempeno, indice) => {
    const nivel = nivelesElegidos[desempeno.id] || null;

    return {
      ...desempeno,
      orden: indice + 1,
      nivel,
      calificado: nivel !== null,
    };
  });
}

export interface ResumenDeAuditoria {
  total: number;
  calificados: number;
  sinCalificar: number;
  completa: boolean;
}

/**
 * Cuántos desempeños quedaron sin calificar.
 *
 * Una plantilla sin desempeños no se declara completa: no hay nada que
 * auditar, y decir lo contrario invitaría a dar por buena una ficha vacía.
 */
export function resumenDeAuditoria(
  auditados: readonly DesempenoAuditado[],
): ResumenDeAuditoria {
  const calificados = auditados.filter((d) => d.calificado).length;

  return {
    total: auditados.length,
    calificados,
    sinCalificar: auditados.length - calificados,
    completa: auditados.length > 0 && calificados === auditados.length,
  };
}
