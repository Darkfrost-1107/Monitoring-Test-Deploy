/**
 * Quién puede firmar una ficha, y por dónde se sirve la imagen de una firma.
 *
 * ── Por qué el rol se deriva y no se recibe ──
 * `SignFichaDto` declara un campo `rolFirmante` y el frontend lo envía, pero no
 * decide nada: el rol sale de comparar la persona del usuario autenticado contra
 * las partes del cronograma. Si se aceptara el del cuerpo, cualquiera podría
 * firmar como evaluador ajeno. Se deja acá, aislado y con pruebas, porque es la
 * decisión de autorización del módulo.
 */

import type { Prisma } from '../../../generated/prisma/client.js';

export type RolFirmante = 'EVALUADO' | 'EVALUADOR';

/**
 * Cómo se ubica la ficha a partir del identificador que llega por la ruta.
 *
 * Los endpoints aceptan el id de la ficha o el del cronograma, y eso alcanzaba
 * mientras cada visita tenía una sola ficha. Desde que una visita docente puede
 * llevar la ficha regular y la EIB, un `cronogramaId` corresponde a DOS fichas y
 * la consulta resolvía con `findFirst` sin orden: elegía una arbitraria. Firmar
 * es un acto sobre el contenido de un instrumento concreto, así que una firma
 * podía terminar estampada en el instrumento equivocado.
 *
 * `plantillaId` desambigua: `(cronogramaId, plantillaId)` es único en el esquema
 * —`uq_ficha_visita_plantilla`— de modo que la pareja identifica exactamente una
 * ficha. Es opcional porque quien pasa el id de la ficha ya es inequívoco.
 */
export function condicionDeFicha(
  idFichaOCronograma: string,
  plantillaId?: string,
): Prisma.FichaMonitoreoWhereInput {
  return {
    OR: [
      { id: idFichaOCronograma },
      plantillaId
        ? { cronogramaId: idFichaOCronograma, plantillaId }
        : { cronogramaId: idFichaOCronograma },
    ],
  };
}

/** Resultado de ubicar la ficha, con la ambigüedad como caso explícito. */
export type ResolucionDeFicha<T> =
  | { estado: 'unica'; ficha: T }
  | { estado: 'ninguna' }
  | { estado: 'ambigua'; cantidad: number };

/**
 * La única ficha que corresponde, o la constancia de que no se puede decidir.
 *
 * Se separa de la consulta para que la ambigüedad sea un caso que el llamador
 * tiene que atender. `findFirst` la ocultaba: devolvía una fila y el código
 * seguía como si fuera la correcta.
 */
export function resolverFicha<T>(fichas: readonly T[]): ResolucionDeFicha<T> {
  if (fichas.length === 0) return { estado: 'ninguna' };
  if (fichas.length > 1) return { estado: 'ambigua', cantidad: fichas.length };

  return { estado: 'unica', ficha: fichas[0] };
}

/** Las dos partes de una visita, tal como llegan del cronograma. */
export interface PartesDeLaVisita {
  evaluado: { personaId: string } | null;
  monitor: { personaId: string } | null;
}

/**
 * El rol con el que esta persona firma la ficha, o nulo si no es parte.
 *
 * Compara por `personaId`, que es la clave que vincula `Usuario` con `Docente` y
 * con `Especialista`. Una persona sin `personaId` no es parte de nada: el
 * esquema lo declara requerido, y comprobarlo acá evita que dos valores ausentes
 * se consideren iguales si eso alguna vez cambia.
 */
export function rolFirmanteDe(
  personaId: string | null | undefined,
  partes: PartesDeLaVisita,
): RolFirmante | null {
  if (!personaId) return null;

  if (partes.evaluado?.personaId === personaId) return 'EVALUADO';
  if (partes.monitor?.personaId === personaId) return 'EVALUADOR';

  return null;
}

/**
 * Si las firmas reunidas cierran la ficha.
 *
 * ── Por qué no se cuenta ──
 * La regla era `count >= 2`. Funcionaba porque el esquema sólo admitía EVALUADOR
 * y EVALUADO, uno por ficha —`@@unique([fichaId, rolFirmante])`—, de modo que
 * contar dos equivalía a «firmaron ambos».
 *
 * El director de la I.E. también firma la ficha docente, al final del monitoreo,
 * como visto bueno sobre una ficha ya finalizada. Con esa tercera firma contar
 * deja de significar lo mismo: EVALUADOR + DIRECTOR sin el evaluado cerraría la
 * ficha sin que el docente la haya firmado, y el código no impone ningún orden
 * de firma.
 *
 * Lo que cierra la ficha son las DOS PARTES de la visita. La firma del director
 * llega después y no participa de esa decisión.
 */
export function debeFinalizarse(rolesFirmados: readonly string[]): boolean {
  const roles = new Set(rolesFirmados.map((rol) => rol.trim().toUpperCase()));

  return roles.has('EVALUADOR') && roles.has('EVALUADO');
}

/**
 * Ruta autenticada por la que se sirve la imagen de una firma estampada.
 *
 * ── Por qué no se devuelve la ruta del archivo ──
 * `saveSignature` guarda en `uploads/`, que `main.ts` publica con
 * `express.static` SIN autenticación. Devolver esa ruta convertía la firma
 * manuscrita de una persona en un archivo descargable por cualquiera que
 * conociera la URL, y el propio endpoint de firmas las entregaba.
 *
 * Esta ruta pasa por el controlador, que exige sesión y aplica el mismo filtro
 * de alcance que el resto de las fichas. El prefijo `/api` lo pone
 * `setGlobalPrefix`, de modo que la ruta declarada acá lo lleva explícito porque
 * el cliente la usa tal cual.
 */
export function rutaDeImagenDeFirma(fichaId: string, rol: RolFirmante): string {
  return `/api/fichas/${fichaId}/firmas/${rol}/imagen`;
}

/** Ruta autenticada por la que cada persona recupera su propia firma. */
export const RUTA_DE_MI_FIRMA = '/api/fichas/me/firma/imagen';

/**
 * Si un nombre de archivo corresponde a una firma guardada en `uploads/`.
 *
 * `main.ts` lo usa para dejar de publicar esos archivos: las firmas viejas ya
 * están en el disco con este nombre y seguirían siendo descargables sin sesión.
 */
export function esArchivoDeFirma(ruta: string): boolean {
  return /(^|\/)firma-[0-9a-fA-F-]+\.png$/.test(ruta);
}
