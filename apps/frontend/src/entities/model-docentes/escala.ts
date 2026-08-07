import type { EscalaMagisterial } from './model';

/**
 * La escala magisterial, entre el número que guarda la base y el romano que se
 * muestra.
 *
 * La conversión estaba escrita tres veces —dos en `docente-service.ts` y una en
 * `DocenteAssignPage`— y las tres degradaban en silencio: `|| 1` en un sentido,
 * `: 'I'` en el otro. Hoy los 869 docentes de la base tienen la columna nula,
 * de modo que esa degradación no era un caso de borde sino la regla, y al
 * asignar un cargo el 'I' inventado volvía a la base como un 1 real.
 */

export const ESCALAS_MAGISTERIALES: readonly EscalaMagisterial[] = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
];

/** El romano de una escala, o nulo si no hay ninguna declarada. */
export function escalaARomano(numero: number | null | undefined): EscalaMagisterial | null {
  if (numero == null || !Number.isInteger(numero)) return null;
  return ESCALAS_MAGISTERIALES[numero - 1] ?? null;
}

/** El número de una escala, o nulo si no hay ninguna declarada. */
export function escalaANumero(romano: string | null | undefined): number | null {
  if (!romano) return null;

  const indice = ESCALAS_MAGISTERIALES.indexOf(romano as EscalaMagisterial);
  return indice === -1 ? null : indice + 1;
}
