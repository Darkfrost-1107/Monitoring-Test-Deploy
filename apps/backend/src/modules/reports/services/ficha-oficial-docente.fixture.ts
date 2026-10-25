import type { FichaOficialRaw } from './ficha-oficial-docente.builder.js';

/** Datos de prueba de una ficha docente finalizada, compartidos por las pruebas del formulario oficial. */

export const persona = (
  over: Partial<FichaOficialRaw['cronograma']['evaluado']['persona']> = {},
) => ({
  nombres: 'MARLENE',
  apellidos: 'GAONA MACHACA',
  dni: '40797767',
  correo: 'marlene@ugel.gob.pe',
  telefono: '951234567',
  ...over,
});

export const rubrica = (romano: string, descripcion: string) => ({
  descripcion,
  nivelCalificacion: { nivelRomano: romano },
});

export const desempeno = (
  orden: number,
  over: Partial<FichaOficialRaw['plantilla']['desempenos'][number]> = {},
) => ({
  id: `d${orden}`,
  nombre: `DESEMPEÑO ${orden}: CRITERIO ${orden}`,
  descripcionCorta: `Descripción del desempeño ${orden}`,
  orden,
  preguntaExtra: null,
  aspectos: [
    { id: `d${orden}-a2`, descripcion: 'Segundo aspecto', orden: 2 },
    { id: `d${orden}-a1`, descripcion: 'Primer aspecto', orden: 1 },
  ],
  rubrica: [
    rubrica('IV', 'Descripción nivel IV'),
    rubrica('I', 'Descripción nivel I'),
    rubrica('III', 'Descripción nivel III'),
    rubrica('II', 'Descripción nivel II'),
  ],
  ...over,
});

export const fichaOficialRaw = (over: Partial<FichaOficialRaw> = {}): FichaOficialRaw => ({
  anioAcademico: 2026,
  lema: 'Año de la recuperación',
  puntajeTotal: 13,
  promedio: 2.6,
  nivelLogro: 'LOGRO_ESPERADO',
  observaciones: 'Observación general',
  sugerencias: 'Una sugerencia',
  compromisos: 'Un compromiso',
  finalizadaAt: new Date('2026-10-16T17:25:00Z'),
  contexto: {
    areaCurricular: 'Ciencia y Tecnología',
    grado: '3',
    seccion: 'C',
    cantidadEstudiantes: 21,
    cantidadEstudiantesNee: 2,
  },
  plantilla: {
    niveles: [
      { nivelRomano: 'II', denominacion: 'En proceso', orden: 2 },
      { nivelRomano: 'I', denominacion: 'Inicio', orden: 1 },
      { nivelRomano: 'IV', denominacion: 'Logro destacado', orden: 4 },
      { nivelRomano: 'III', denominacion: 'Logro esperado', orden: 3 },
    ],
    desempenos: [1, 2, 3, 4, 5].map((n) => desempeno(n)),
    ejesItems: [
      { id: 'e2', numero: 2, descripcion: 'Diseña una evaluación', orden: 2 },
      { id: 'e1', numero: 1, descripcion: 'Planifica el proceso', orden: 1 },
    ],
  },
  respuestasDesempeno: [
    { desempenoId: 'd1', nivel: 4, observaciones: 'Muy bien', preguntaExtraRespuesta: null },
    { desempenoId: 'd2', nivel: 1, observaciones: null, preguntaExtraRespuesta: null },
    { desempenoId: 'd3', nivel: 3, observaciones: 'Bien', preguntaExtraRespuesta: null },
    { desempenoId: 'd4', nivel: 2, observaciones: 'Regular', preguntaExtraRespuesta: null },
    { desempenoId: 'd5', nivel: 3, observaciones: 'Bien', preguntaExtraRespuesta: null },
  ],
  respuestasEjeItem: [
    { ejeItemId: 'e1', nivel: 3, observacion: 'Planifica bien', evidenciaUrl: null },
    { ejeItemId: 'e2', nivel: 2, observacion: null, evidenciaUrl: null },
  ],
  cronograma: {
    fechaProgramada: new Date('2026-10-16T00:00:00Z'),
    horaInicio: '12:23:00',
    institucion: {
      nombre: 'JOSE CARLOS MARIATEGUI',
      codigoModular: '0548081',
      modalidad: 'EBR',
      nivelEducativo: 'Secundaria',
      departamento: 'Puno',
      provincia: 'Lampa',
      distrito: 'Palca',
      direccion: 'Jr. Los Andes 123',
      zona: 'Rural',
    },
    evaluado: {
      condicionLaboral: 'Nombrado',
      modalidad: 'EBR',
      nivelEducativo: 'Secundaria',
      persona: persona(),
    },
    monitor: {
      cargo: 'Especialista',
      persona: persona({ nombres: 'PEDRO PABLO', apellidos: 'MAMANI CRUZ', dni: '40000002' }),
    },
  },
  director: {
    nombre: 'JUAN PEREZ',
    dni: '01234567',
    correo: 'juan@ugel.gob.pe',
    telefono: '999888777',
    condicion: 'Designado',
  },
  firmas: [],
  evidencias: [],
  ...over,
});
