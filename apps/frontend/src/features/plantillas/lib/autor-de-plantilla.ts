import type { RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';

/**
 * Quién es dueño de una plantilla, dicho en cargo.
 *
 * Desde que cada actor de la institución tiene la suya (`030a571`), el Director
 * ve en su catálogo hasta tres plantillas vigentes del mismo tipo y del mismo
 * año: la suya, la del Coordinador Pedagógico y la del Jefe de Taller. Eso es
 * correcto —una vigente por autor—, pero la tarjeta sólo rotulaba el nombre de
 * la institución, igual en las tres, y se leía como registros duplicados.
 *
 * ── Por qué el cargo y no sólo el nombre ──
 * El nombre de la persona lo trae `Plantilla.autorNombre`, pero identifica a
 * quien la creó, no al puesto que la usa. El cargo es lo que decide qué ficha
 * se aplica en la visita, así que va en la insignia y el nombre queda como dato
 * de detalle.
 */

const ETIQUETA_POR_AUTOR: Record<RolAutorPlantilla, string> = {
  jefe_gestion: 'UGEL',
  director_ie: 'Director',
  coordinador_pedagogico: 'Coordinador Pedagógico',
  jefe_taller: 'Jefe de Taller',
};

/**
 * El cargo del autor de la plantilla.
 *
 * Sin `creadoPorRole` se responde «UGEL»: son las plantillas anteriores a que se
 * registrara el rol del autor, y `esDeUgel` las cuenta como de la UGEL. Si acá
 * dijera otra cosa, la insignia contradiría al filtro de origen.
 */
export const etiquetaDeAutor = (creadoPorRole: RolAutorPlantilla | undefined): string =>
  creadoPorRole ? (ETIQUETA_POR_AUTOR[creadoPorRole] ?? 'UGEL') : 'UGEL';
