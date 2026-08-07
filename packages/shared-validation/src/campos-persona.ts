import { z } from 'zod';

/**
 * Primitivas de validación de los datos de una persona.
 *
 * Fase 6 de PLAN_REMEDIACION.md, tarea 4. Los tres esquemas de alta de personal
 * —docente, director y especialista— repetían estos campos con reglas y
 * mensajes propios. El DNI era idéntico en los tres; el resto discrepaba, y esa
 * discrepancia estaba escondida en tres archivos distintos.
 *
 * Acá cada variante se declara con nombre. Que el correo sea obligatorio para
 * un docente y opcional para un especialista deja de ser un detalle enterrado y
 * pasa a leerse en la composición del esquema.
 *
 * ── Alcance ──
 * Este paquete es la fuente única del **frontend**. El backend valida con
 * `class-validator` de NestJS y no tiene Zod entre sus dependencias, de modo
 * que unificar ambos lados es una decisión pendiente y no un cableado. Ver la
 * nota de la Fase 6 en PLAN_REMEDIACION.md.
 */

/** Longitud del documento nacional de identidad peruano. */
export const LARGO_DNI = 8;

/** Longitud de un número de celular peruano. */
export const LARGO_CELULAR = 9;

/** Los celulares peruanos empiezan con 9. */
const CELULAR_PERUANO = /^9\d{8}$/;

/**
 * Documento de identidad.
 *
 * Es el único campo idéntico en los tres esquemas: ocho dígitos, sin letras ni
 * separadores. Se usa además como clave para buscar a la persona en el padrón.
 */
export const dni = () =>
  z
    .string()
    .length(LARGO_DNI, `El DNI debe tener exactamente ${LARGO_DNI} dígitos`)
    .regex(/^\d+$/, 'El DNI solo debe contener números');

/**
 * Nombre o apellido.
 *
 * El mensaje se pasa como parámetro porque los tres formularios lo redactan
 * distinto y cambiar el texto visible no es tarea de una consolidación técnica.
 */
export const nombreDePersona = (mensaje: string) => z.string().min(2, mensaje);

/** Correo electrónico obligatorio, como lo exigen docente y director. */
export const correoObligatorio = (mensaje = 'Formato de correo electrónico inválido') =>
  z.string().email(mensaje);

/**
 * Correo electrónico opcional, como lo admite especialista.
 *
 * Acepta la cadena vacía además de la ausencia: es lo que entrega un campo de
 * formulario que el usuario dejó en blanco.
 */
export const correoOpcional = (mensaje = 'Debe ingresar un correo electrónico válido') =>
  z.string().email(mensaje).or(z.literal('')).optional();

/** Celular obligatorio, como lo exigen docente y director. */
export const celularObligatorio = (
  mensaje = `Debe ser un número de celular de ${LARGO_CELULAR} dígitos (ej. 987654321)`,
) => z.string().regex(CELULAR_PERUANO, mensaje);

/**
 * Celular opcional, como lo admite especialista.
 *
 * Comprueba largo y formato por separado para poder decir cuál de los dos
 * falla: «faltan dígitos» y «no empieza con 9» son errores distintos y el
 * usuario corrige cosas distintas. Acepta el mismo conjunto de valores que
 * `celularObligatorio`; lo que cambia es el detalle del mensaje.
 */
export const celularOpcional = (
  mensajeLargo = `El número de celular debe tener exactamente ${LARGO_CELULAR} dígitos`,
  mensajeFormato = 'El celular debe iniciar con 9',
) =>
  z
    .string()
    .length(LARGO_CELULAR, mensajeLargo)
    .regex(/^9\d+$/, mensajeFormato)
    .or(z.literal(''))
    .optional();

/** Escala magisterial, de I a VIII. */
export const escalaMagisterial = () =>
  z.enum(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);

/** Horas de carga, con los topes que admite el régimen. */
export const cargaHoraria = (minimo: number, maximo: number) =>
  z
    .number({ message: 'Debe ser un número' })
    .min(minimo, `Carga horaria mínima es ${minimo} hora${minimo === 1 ? '' : 's'}`)
    .max(maximo, `Carga horaria máxima es ${maximo} horas`);
