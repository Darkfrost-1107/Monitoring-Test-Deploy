import { z } from 'zod';
import { LARGO_MAXIMO_ENLACE, esEnlaceDriveValido } from './enlace-drive.js';

/**
 * Envoltorio Zod del enlace de Drive, para los formularios del frontend.
 *
 * Vive aparte de la regla en si a proposito. `enlace-drive.ts` no depende de
 * nada, de modo que el backend —que valida con class-validator y no tiene Zod
 * entre sus dependencias— importa la misma funcion en lugar de reescribir la
 * lista blanca de hosts por su cuenta. Una regla de seguridad duplicada en dos
 * codigos es una regla que en algun momento diverge.
 */
/** Esquema Zod del enlace, para los formularios del frontend. */
export const enlaceDrive = () =>
  z
    .string()
    .trim()
    .max(LARGO_MAXIMO_ENLACE, `El enlace no puede superar los ${LARGO_MAXIMO_ENLACE} caracteres`)
    .refine(esEnlaceDriveValido, {
      message: 'Debe ser un enlace https de Google Drive o Google Docs',
    });
