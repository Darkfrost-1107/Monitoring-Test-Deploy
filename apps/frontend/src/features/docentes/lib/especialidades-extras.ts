import { especialidadesDelNivel } from './grados-y-secciones';

// Sin tildes ni mayúsculas: el valor guardado puede venir sin tilde
// («Comunicacion») y el catálogo con tilde («Comunicación»), y son la misma área.
export const normalizarArea = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** ¿El área ya está tomada por la principal o alguna extra (ignorando tildes)? */
export const areaYaUsada = (
  valor: string,
  principal: string | null | undefined,
  extras: string[],
): boolean =>
  [principal, ...extras].some((s) => Boolean(s) && normalizarArea(s as string) === normalizarArea(valor));

/**
 * Áreas del catálogo que quedan para sumar como extra: las del nivel, quitando la
 * principal y las ya agregadas (comparando sin tildes ni mayúsculas, porque un
 * dato viejo puede venir sin tilde y el catálogo con tilde).
 */
export function especialidadesExtrasDisponibles(
  nivel: string,
  principal: string | null | undefined,
  extras: string[],
): string[] {
  return especialidadesDelNivel(nivel).filter((e) => !areaYaUsada(e, principal, extras));
}
