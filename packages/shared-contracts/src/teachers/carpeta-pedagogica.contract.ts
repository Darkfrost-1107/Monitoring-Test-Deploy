/**
 * Carpeta pedagógica — contrato compartido.
 *
 * El docente publica su portafolio (programación anual, unidades, sesiones,
 * evidencias) en Google Drive y registra acá el enlace de la carpeta. El
 * sistema no almacena los archivos: guarda la referencia y el rastro de quién
 * la actualizó.
 *
 * Es un enlace por docente y por año escolar. La organización interna de la
 * carpeta queda del lado del docente, que es lo que se acordó con el cliente
 * frente a la alternativa de un checklist de documentos.
 */

/**
 * Primer año escolar con carpeta pedagógica: el de puesta en marcha.
 *
 * Antes de esta fecha la función no existía, de modo que ningún año anterior
 * puede tener enlace. Ofrecerlos en el selector sería llenar la lista de
 * opciones que nunca van a devolver nada.
 *
 * La lista de años no se fija acá: arranca en esta constante y crece sola con
 * el calendario, porque cada año escolar trae una carpeta distinta.
 */
export const ANIO_ESCOLAR_INICIAL = 2026;

/**
 * Años escolares que admite la carpeta pedagógica, en orden creciente.
 *
 * Termina en el año EN CURSO: no se ofrecen años futuros. El portafolio
 * documenta un ciclo lectivo que está ocurriendo, y un enlace cargado contra un
 * año que todavía no empezó no describe nada. Peor: quedaría fuera del alcance
 * de cualquier monitoreo hasta que ese año llegue, sin que nadie lo advierta.
 *
 * @param anioActual año en curso; se inyecta para que la función sea
 *   determinista y verificable, en lugar de leer el reloj por dentro.
 */
export const aniosEscolaresDisponibles = (anioActual: number): number[] => {
  // Un reloj mal configurado no debe vaciar la lista: el año de puesta en
  // marcha es siempre una opción válida.
  const maximo = Math.max(anioActual, ANIO_ESCOLAR_INICIAL);
  const total = maximo - ANIO_ESCOLAR_INICIAL + 1;
  return Array.from({ length: total }, (_, i) => ANIO_ESCOLAR_INICIAL + i);
};

/** Último año escolar con carpeta pedagógica: el que está en curso. */
export const anioEscolarVigente = (anioActual: number): number =>
  Math.max(anioActual, ANIO_ESCOLAR_INICIAL);

/** Enlace vigente de la carpeta pedagógica de un docente para un año escolar. */
export interface ICarpetaPedagogica {
  id: string;
  docenteId: string;
  /** Año escolar al que corresponde el portafolio. */
  anioEscolar: number;
  /** URL de la carpeta en Google Drive. Validada contra una lista blanca de hosts. */
  url: string;
  /** Nota breve del docente sobre el contenido. Opcional. */
  descripcion: string | null;
  /** Fecha del último registro o cambio del enlace. */
  actualizadoEn: string;
  /** Nombre de quien registró el enlace por última vez, para trazabilidad. */
  actualizadoPor: string | null;
}

/** Alta o reemplazo del enlace del año indicado. */
export interface IGuardarCarpetaPedagogicaRequest {
  anioEscolar: number;
  url: string;
  descripcion?: string;
}

/**
 * Respuesta de consulta. `carpeta` es `null` cuando el docente todavía no
 * registró enlace para ese año: es una ausencia esperada, no un error.
 */
export interface ICarpetaPedagogicaResponse {
  carpeta: ICarpetaPedagogica | null;
}
