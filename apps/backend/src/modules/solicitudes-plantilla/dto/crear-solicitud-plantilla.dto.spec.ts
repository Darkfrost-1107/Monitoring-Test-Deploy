import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CargoBeneficiario } from '@sistema-monitoreo/shared-contracts';
import { CrearSolicitudPlantillaDto } from './crear-solicitud-plantilla.dto.js';

/**
 * Validación del alta de una solicitud, tal como llega desde el formulario.
 *
 * La petición es `multipart/form-data`, porque lleva el PDF adjunto, y ese
 * formato transporta ÚNICAMENTE texto: el año llega como `"2026"` y los ítems
 * como una cadena JSON. Todo lo que el DTO haga con eso ocurre antes de que
 * cualquier prueba de servicio entre en juego.
 *
 * Las pruebas del servicio no cubren esta capa: le pasan objetos ya formados.
 * Por eso hace falta ejercitar el pipe REAL, con la misma configuración que
 * `main.ts` —`whitelist` y `forbidNonWhitelisted`—, que es la que rechaza una
 * propiedad sin decorador de validación.
 */

/** El mismo pipe que corre en producción. */
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});

const metadata = { type: 'body' as const, metatype: CrearSolicitudPlantillaDto };

/**
 * Los mensajes de validación que el cliente va a recibir.
 *
 * `BadRequestException.message` es sólo «Bad Request Exception»: el detalle
 * viaja en el cuerpo de la respuesta, que es lo que ve el frontend. Afirmar
 * sobre el cuerpo prueba el texto real y no la etiqueta genérica.
 */
const motivosDelRechazo = async (cuerpo: Record<string, unknown>): Promise<string> => {
  try {
    await pipe.transform(cuerpo, metadata);
  } catch (error) {
    if (error instanceof BadRequestException) {
      const respuesta = error.getResponse() as { message?: string[] | string };
      return Array.isArray(respuesta.message)
        ? respuesta.message.join(' | ')
        : (respuesta.message ?? '');
    }
    throw error;
  }
  throw new Error('Se esperaba que la validación rechazara el cuerpo, y lo aceptó.');
};

const item = {
  instrumento: 'DOCENTE',
  cargoBeneficiario: CargoBeneficiario.JEFE_DE_TALLER,
  // El cupo se aprueba a nombre de una persona: sin destinatario lo consume el
  // primero de ese cargo que entre.
  beneficiarioId: '3f2a6d1e-7c4b-4a2e-9f10-0b5c8d3e7a91',
  descripcion: 'criterios relacionados a la carpintería',
};

/** Cuerpo tal como lo arma `FormData`: puro texto. */
const comoFormData = (over: Record<string, unknown> = {}) => ({
  anioEscolar: '2026',
  items: JSON.stringify([item]),
  ...over,
});

describe('CrearSolicitudPlantillaDto', () => {
  it('acepta el cuerpo que manda el formulario, con los items como texto JSON', async () => {
    // El defecto que esto fija: `@Transform` reemplaza a `@Type` sobre la misma
    // propiedad, de modo que los ítems quedaban como objetos planos sin
    // metadatos de validación. `forbidNonWhitelisted` los veía sin decorador y
    // respondía «property instrumento should not exist» por cada campo.
    const resultado = (await pipe.transform(
      comoFormData(),
      metadata,
    )) as CrearSolicitudPlantillaDto;

    expect(resultado.anioEscolar).toBe(2026);
    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0]).toMatchObject(item);
  });

  it('convierte el año de texto a número', async () => {
    const resultado = (await pipe.transform(
      comoFormData(),
      metadata,
    )) as CrearSolicitudPlantillaDto;

    expect(typeof resultado.anioEscolar).toBe('number');
  });

  it('sigue aceptando los items como arreglo, no sólo como texto', async () => {
    const resultado = (await pipe.transform(
      comoFormData({ items: [item] }),
      metadata,
    )) as CrearSolicitudPlantillaDto;

    expect(resultado.items[0]).toMatchObject(item);
  });

  it('rechaza un instrumento que la institucion no puede pedir', async () => {
    // La ficha directiva es del especialista de la UGEL.
    const motivos = await motivosDelRechazo(
      comoFormData({ items: JSON.stringify([{ ...item, instrumento: 'DIRECTIVO' }]) }),
    );

    expect(motivos).toMatch(/instrumento/i);
  });

  it('rechaza un cargo que no existe en la institucion', async () => {
    const motivos = await motivosDelRechazo(
      comoFormData({ items: JSON.stringify([{ ...item, cargoBeneficiario: 'Especialista' }]) }),
    );

    expect(motivos).toMatch(/cargoBeneficiario/i);
  });

  /**
   * El cupo se aprueba a nombre de una persona. Sin destinatario lo consume el
   * primero de ese cargo que entre, que es justo lo que el campo vino a cerrar.
   */
  it('rechaza un item sin destinatario', async () => {
    const sinDestinatario = { ...item };
    delete (sinDestinatario as Record<string, unknown>).beneficiarioId;

    const motivos = await motivosDelRechazo(
      comoFormData({ items: JSON.stringify([sinDestinatario]) }),
    );

    expect(motivos).toMatch(/beneficiarioId/i);
  });

  it('rechaza un destinatario que no es un identificador', async () => {
    const motivos = await motivosDelRechazo(
      comoFormData({ items: JSON.stringify([{ ...item, beneficiarioId: 'la-marta' }]) }),
    );

    expect(motivos).toMatch(/beneficiarioId/i);
  });

  it('rechaza una lista de items vacia', async () => {
    expect(await motivosDelRechazo(comoFormData({ items: '[]' }))).toMatch(/items/i);
  });

  it('rechaza un JSON malformado sin reventar con una traza de parseo', async () => {
    // El texto se devuelve intacto para que `@IsArray` produzca el mensaje.
    expect(await motivosDelRechazo(comoFormData({ items: '{no es json' }))).toMatch(/items/i);
  });

  it('rechaza propiedades que el cuerpo no debe traer', async () => {
    // `institucionId` sale de la sesión: aceptarlo acá sería una invitación a
    // presentar un pedido en nombre de otra institución.
    expect(await motivosDelRechazo(comoFormData({ institucionId: 'ie-ajena' }))).toMatch(
      /institucionId/i,
    );
  });
});
