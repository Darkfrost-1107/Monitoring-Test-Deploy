import { especialidadesDelNivel } from './grados-y-secciones';
import { normalizarArea, areaYaUsada } from '@shared/lib/especialidades-secundaria';

export { normalizarArea, areaYaUsada };

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
