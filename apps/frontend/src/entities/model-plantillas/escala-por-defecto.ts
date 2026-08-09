import type { Baremo, NivelCalificacion } from './model';

const esDirectivo = (tipoMonitoreo: string) => tipoMonitoreo === 'Monitoreo Directivo';

/**
 * Escala de calificación que se propone al registrar una plantilla.
 *
 * ── Por qué depende del tipo de monitoreo ──
 * Las dos rúbricas de la UGEL Lampa cortan distinto y llaman distinto a sus
 * niveles. La docente evalúa cinco desempeños de 1 a 4 y reparte el total
 * 5–20 en 5·8·13·18. La directiva suma cinco rúbricas sobre un total 0–24 y
 * corta en 0·9·17·21, con otros nombres. No hay una escala que sirva a las dos.
 *
 * ── Por qué esto importa ahora ──
 * Antes se proponía una sola escala —0/11/15/18, «Muy Insatisfactorio / En
 * Proceso / Satisfactorio / Destacado»— que no venía de ningún documento
 * oficial. Pasaba inadvertida porque el motor ignoraba `rangoMin` y clasificaba
 * con umbrales fijos sobre el promedio. Hoy el motor honra estos números: lo
 * que se proponga acá es lo que va a decidir el nivel de logro de cada ficha.
 *
 * Son valores **propuestos**, no impuestos: la pantalla de registro los deja
 * editar, que es como el año que cambien los rangos se resuelve sin tocar
 * código.
 */

/**
 * FICHA Y RÚBRICA DE MONITOREO AL DOCENTE 2025 — UGEL Lampa.
 *
 * Se califica con puntaje, no con porcentaje: su leyenda da la columna TOTAL
 * sobre la escala de 0 a 20 —[5-7], [8-12], [13-17], [18-20]— que es lo que la
 * pantalla ofrece como «Vigente (0-20)». El total sale de los cinco desempeños
 * de observación de aula; los ejes e items se informan aparte.
 *
 * Una plantilla con otra cantidad de desempeños mueve su techo, y entonces
 * estos cortes hay que ajustarlos en la pantalla de registro. Son valores
 * propuestos, no impuestos.
 */
const ESCALA_DOCENTE: readonly NivelCalificacion[] = [
  { nivel: 'I', denominacion: 'Inicio', rangoMin: 5, color: '#ef4444' },
  { nivel: 'II', denominacion: 'En proceso', rangoMin: 8, color: '#f59e0b' },
  { nivel: 'III', denominacion: 'Logro esperado', rangoMin: 13, color: '#22c55e' },
  { nivel: 'IV', denominacion: 'Logro destacado', rangoMin: 18, color: '#3b82f6' },
];

/**
 * FICHA Y RÚBRICA DE MONITOREO DIRECTIVO 2025. Se resuelve por porcentaje.
 *
 * El consolidado del documento tiene dos filas por rúbrica —«NIVEL DE LOGRO» y
 * «% DE AVANCE»— y su baremo rotula cada tramo con un porcentaje: 25 · 50 · 75
 * · 100. Ése es el mecanismo, y por eso esta escala es `Porcentual`.
 *
 * ── Por qué no se usan los rangos absolutos del documento ──
 * El baremo también lista 00-08, 09-16, 17-20 y 21-24. Esos números están
 * calculados sobre **24 puntos**, que son seis rúbricas de cuatro niveles:
 * 25% de 24 = 6 (cae en 00-08), 50% = 12 (en 09-16), 75% = 18 (en 17-20) y
 * 100% = 24 (en 21-24). Encajan los cuatro.
 *
 * La ficha vigente tiene **cinco** rúbricas —R1 a R5, con sus cinco páginas de
 * detalle— de modo que su máximo es 20 y sobre el puntaje crudo el tramo 21-24
 * quedaría fuera de alcance. Los rangos absolutos vienen de una versión de seis
 * rúbricas; el porcentaje no depende de cuántas tenga la ficha y sigue siendo
 * fiel al documento.
 *
 * ── Qué nombres se usan ──
 * El documento nombra distinto la marca y el resultado: su tabla «NIVELES DEL
 * LOGRO» rotula la marca de cada rúbrica —Inicio, En Proceso, Logro Esperado,
 * Logro Destacado, iguales a las del docente— y el baremo del consolidado
 * rotula el resultado —En inicio, En proceso, Logrado, Satisfactorio—.
 *
 * Se proponen los del consolidado, que son los que distinguen a este
 * instrumento del docente. Con los de marca las dos plantillas se veían iguales
 * en pantalla y no había forma de diferenciarlas.
 */
const ESCALA_DIRECTIVO: readonly NivelCalificacion[] = [
  { nivel: 'I', denominacion: 'En inicio', rangoMin: 25, color: '#ef4444' },
  { nivel: 'II', denominacion: 'En proceso', rangoMin: 50, color: '#f59e0b' },
  { nivel: 'III', denominacion: 'Logrado', rangoMin: 75, color: '#22c55e' },
  { nivel: 'IV', denominacion: 'Satisfactorio', rangoMin: 100, color: '#3b82f6' },
];

/**
 * Escala propuesta para un tipo de monitoreo.
 *
 * Devuelve una copia nueva en cada llamada: el formulario la edita en sitio y
 * una referencia compartida arrastraría los cambios a la plantilla siguiente.
 *
 * Un tipo desconocido cae en la escala docente, que es la de uso corriente:
 * devolver una lista vacía dejaría la plantilla sin escala y el cálculo
 * volvería a los umbrales fijos sin que nadie lo note.
 */
export function nivelesPorDefecto(tipoMonitoreo: string): NivelCalificacion[] {
  const escala = esDirectivo(tipoMonitoreo) ? ESCALA_DIRECTIVO : ESCALA_DOCENTE;

  return escala.map((nivel) => ({ ...nivel }));
}

/**
 * Cómo se leen los cortes de esa escala.
 *
 * La rúbrica docente se califica con **puntaje** sobre la escala de 0 a 20, tal
 * como da su leyenda. La directiva se resuelve por **porcentaje de avance**: su
 * consolidado lleva una fila «% DE AVANCE» y su baremo rotula cada tramo con
 * 25·50·75·100.
 */
export function baremoPorDefecto(tipoMonitoreo: string): Baremo {
  return esDirectivo(tipoMonitoreo) ? 'Porcentual' : 'Vigente';
}
