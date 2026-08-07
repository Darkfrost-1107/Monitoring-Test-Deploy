import { describe, it, expect } from 'vitest';
import {
  participantesDeLaFicha,
  type PadronDeFicha,
  type VisitaDeFicha,
} from './participantes-de-ficha';

/**
 * Quién figura en la ficha impresa: docente evaluado, monitor, institución y
 * director. La resolución vivía dentro de `FichaPrintable` en cuatro
 * expresiones `find(por id) || find(por nombre en minúsculas)`.
 */

const visita = (over: Partial<VisitaDeFicha> = {}): VisitaDeFicha => ({
  tipo: 'DOCENTE',
  evaluadoId: 'doc-1',
  monitorId: 'esp-1',
  institucionId: 'ie-1',
  docenteDirectivo: 'Ana Torres',
  especialista: 'Luis Quispe',
  institucion: 'IE 70001',
  ...over,
});

const ANA = {
  id: 'doc-1', nombres: 'Ana', apellidos: 'Torres', dni: '11111111',
  correo: 'ana@ie.pe', celular: '911111111', condicion: 'Nombrado',
  institucionId: 'ie-1', cargo: 'Docente de Aula',
};

const ROSA_DIRECTORA = {
  id: 'doc-dir', nombres: 'Rosa', apellidos: 'Mamani', dni: '22222222',
  correo: 'rosa@ie.pe', celular: '922222222', condicion: 'Designado',
  institucionId: 'ie-1', cargo: 'Director',
};

const LUIS = {
  id: 'esp-1', nombre: 'Luis Quispe', dni: '33333333',
  correo: 'luis@ugel.pe', celular: '933333333', cargo: 'Especialista',
};

const padron = (over: Partial<PadronDeFicha> = {}): PadronDeFicha => ({
  docentes: [ANA, ROSA_DIRECTORA],
  especialistas: [LUIS],
  instituciones: [{ id: 'ie-1', nombre: 'IE 70001', codigoModular: '0123456' }],
  ...over,
});

describe('participantesDeLaFicha — identificación', () => {
  it('encuentra al evaluado, al monitor y a la institución por identificador', () => {
    const { docente, especialista, institucion } = participantesDeLaFicha(visita(), padron());

    expect(docente?.id).toBe('doc-1');
    expect(especialista?.id).toBe('esp-1');
    expect(institucion?.id).toBe('ie-1');
  });

  /**
   * Antes, si el identificador no encontraba a nadie se buscaba por nombre en
   * minúsculas. `evaluado_id`, `monitor_id` e `institucion_id` son columnas no
   * nulas con clave foránea: si el identificador no encuentra a nadie, el
   * padrón cargado está incompleto, y adivinar por nombre puede traer a otra
   * persona a un documento oficial.
   */
  it('no cae en la búsqueda por nombre cuando el identificador no encuentra a nadie', () => {
    const otro = visita({ evaluadoId: 'doc-inexistente' });
    expect(participantesDeLaFicha(otro, padron()).docente).toBeNull();
  });

  it('no toma a un homónimo del monitor', () => {
    const otro = visita({ monitorId: 'esp-9', especialista: 'Luis Quispe' });
    expect(participantesDeLaFicha(otro, padron()).especialista).toBeNull();
  });
});

describe('participantesDeLaFicha — director', () => {
  it('en una visita a docente, el director es el de su institución', () => {
    const { director } = participantesDeLaFicha(visita(), padron());

    expect(director.nombre).toBe('Rosa Mamani');
    expect(director.dni).toBe('22222222');
    expect(director.condicion).toBe('Designado');
  });

  /**
   * En una visita directiva el evaluado ES el director, así que sus datos
   * salen del evaluado y no de una segunda búsqueda en el padrón.
   */
  it('en una visita directiva, el director es el propio evaluado', () => {
    const { director } = participantesDeLaFicha(visita({ tipo: 'DIRECTIVO' }), padron());

    expect(director.nombre).toBe('Ana Torres');
    expect(director.dni).toBe('11111111');
  });

  it('recurre a los datos de la institución cuando no hay director en el padrón', () => {
    const sinDirector = padron({
      docentes: [ANA],
      instituciones: [
        {
          id: 'ie-1',
          nombre: 'IE 70001',
          codigoModular: '0123456',
          director: 'Rosa Mamani',
          directorDni: '22222222',
          directorCorreo: 'rosa@ie.pe',
          directorTelefono: '922222222',
        },
      ],
    });

    const { director } = participantesDeLaFicha(visita(), sinDirector);
    expect(director.nombre).toBe('Rosa Mamani');
    expect(director.dni).toBe('22222222');
  });

  it('deja los campos vacíos cuando no hay dato alguno, sin inventarlos', () => {
    const vacio = padron({ docentes: [ANA], instituciones: [] });
    const { director } = participantesDeLaFicha(visita(), vacio);

    expect(director).toEqual({ nombre: '', dni: '', correo: '', celular: '', condicion: '' });
  });

  it('no toma como director al de otra institución', () => {
    const otraIE = padron({
      docentes: [ANA, { ...ROSA_DIRECTORA, institucionId: 'ie-9' }],
    });

    expect(participantesDeLaFicha(visita(), otraIE).director.nombre).toBe('');
  });
});

describe('participantesDeLaFicha — padrón sin cargar', () => {
  it('no falla cuando las listas todavía no llegaron', () => {
    const resultado = participantesDeLaFicha(visita(), {
      docentes: undefined,
      especialistas: undefined,
      instituciones: undefined,
    });

    expect(resultado.docente).toBeNull();
    expect(resultado.director.nombre).toBe('');
  });
});
