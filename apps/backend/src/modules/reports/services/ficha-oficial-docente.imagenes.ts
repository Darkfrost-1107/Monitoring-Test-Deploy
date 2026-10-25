import type { FichaOficialRaw } from './ficha-oficial-docente.builder.js';
import { resolverImagenEmbebida } from './imagen-embebida.helper.js';

/**
 * La ficha como se guarda: sus firmas y fotos son rutas a archivos, y la
 * evidencia general un campo de texto. El formulario necesita imágenes incrustadas.
 */
export type FichaOficialPersistida = Omit<FichaOficialRaw, 'firmas' | 'evidencias'> & {
  firmas: { rolFirmante: string; nombre: string; fecha: Date; imagenUrl: string | null }[];
  evidenciaGeneral: string | null;
};

type Resolvedor = (referencia: string | null | undefined) => Promise<string | null>;

/**
 * Lee `evidenciaGeneral`.
 *
 * Conviven dos formatos en la base: un JSON con las ranuras `GENERAL_1/2/3` y una
 * referencia suelta de las fichas anteriores a las ranuras. Un JSON ilegible se
 * toma como referencia suelta, que el resolvedor descartará si no es una imagen.
 */
function referenciasDeEvidencia(crudo: string | null): string[] {
  if (!crudo) return [];

  if (crudo.trim().startsWith('{')) {
    try {
      const ranuras = JSON.parse(crudo) as Record<string, string>;
      return Object.keys(ranuras)
        .sort((a, b) => a.localeCompare(b))
        .map((clave) => ranuras[clave]);
    } catch {
      return [crudo];
    }
  }

  return [crudo];
}

export async function completarImagenes(
  ficha: FichaOficialPersistida,
  resolver: Resolvedor = resolverImagenEmbebida,
): Promise<FichaOficialRaw> {
  const { firmas, evidenciaGeneral, ...resto } = ficha;

  const firmasConImagen = await Promise.all(
    firmas.map(async ({ imagenUrl, ...firma }) => ({
      ...firma,
      imagen: await resolver(imagenUrl),
    })),
  );

  const resueltas = await Promise.all(referenciasDeEvidencia(evidenciaGeneral).map(resolver));

  return {
    ...resto,
    firmas: firmasConImagen,
    evidencias: resueltas.filter((imagen): imagen is string => imagen !== null),
  };
}
