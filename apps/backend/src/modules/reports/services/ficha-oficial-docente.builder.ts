import { CargoNombre } from '../../../common/enums/cargo.enum.js';
/**
 * Ficha oficial de monitoreo al docente, lista para pintar.
 *
 * Convierte lo que hay en la base en lo que necesita el formulario de la UGEL:
 * qué casillas van marcadas, cómo se numeran los ítems de planificación, el
 * consolidado y la leyenda. La plantilla sólo pinta; las reglas viven acá, donde
 * se pueden probar sin levantar un navegador.
 *
 * Es una función pura. Las imágenes (firmas y evidencias) llegan ya resueltas a
 * data URI: leer archivos es asunto del servicio, no del formato.
 */

const NIVELES_ROMANOS = ['I', 'II', 'III', 'IV'] as const;

const CARGO_DREP = 'DREP';
const CARGO_DIRECTOR: string = CargoNombre.DIRECTOR;
const CARGOS_DE_COORDINACION: string[] = [
  CargoNombre.COORDINADOR_PEDAGOGICO,
  CargoNombre.JEFE_TALLER,
];

const ASPECTOS_EN_LETRAS = [
  '',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
];

interface PersonaRaw {
  nombres: string;
  apellidos: string;
  dni: string;
  correo: string | null;
  telefono: string | null;
}

export interface FichaOficialRaw {
  anioAcademico: number;
  lema: string | null;
  puntajeTotal: number | null;
  promedio: number | null;
  nivelLogro: string | null;
  observaciones: string | null;
  sugerencias: string | null;
  compromisos: string | null;
  finalizadaAt: Date | null;
  contexto: {
    areaCurricular: string | null;
    grado: string | null;
    seccion: string | null;
    cantidadEstudiantes: number | null;
    cantidadEstudiantesNee: number | null;
  } | null;
  plantilla: {
    niveles: { nivelRomano: string; denominacion: string; orden: number }[];
    desempenos: {
      id: string;
      nombre: string;
      descripcionCorta: string | null;
      orden: number;
      preguntaExtra: string | null;
      aspectos: { id: string; descripcion: string; orden: number }[];
      rubrica: { descripcion: string; nivelCalificacion: { nivelRomano: string } }[];
    }[];
    ejesItems: { id: string; numero: number; descripcion: string; orden: number }[];
  };
  respuestasDesempeno: {
    desempenoId: string;
    nivel: number;
    observaciones: string | null;
    preguntaExtraRespuesta: boolean | null;
  }[];
  respuestasEjeItem: {
    ejeItemId: string;
    nivel: number;
    observacion: string | null;
    evidenciaUrl: string | null;
  }[];
  cronograma: {
    fechaProgramada: Date;
    horaInicio: string;
    institucion: {
      nombre: string;
      codigoModular: string;
      modalidad: string;
      nivelEducativo: string;
      departamento: string;
      provincia: string;
      distrito: string;
      direccion: string;
      zona: string;
    };
    evaluado: {
      condicionLaboral: string | null;
      modalidad: string | null;
      nivelEducativo: string;
      persona: PersonaRaw;
    };
    monitor: { cargo: string; persona: PersonaRaw };
  };
  director: {
    nombre: string;
    dni: string;
    correo: string | null;
    telefono: string | null;
    condicion: string | null;
  } | null;
  firmas: { rolFirmante: string; nombre: string; fecha: Date; imagen: string | null }[];
  /** Fotografías de la evidencia general, como data URI. */
  evidencias: string[];
}

export type CeldaDeNivel = 'libre' | 'gris' | 'marcada';

export interface DesempenoOficial {
  numero: number;
  nombre: string;
  descripcion: string;
  introAspectos: string;
  aspectos: string[];
  rubrica: { romano: string; descripcion: string; celdas: CeldaDeNivel[] }[];
  evidencias: string;
  preguntaExtra: { texto: string; si: boolean; no: boolean } | null;
}

export interface FichaOficialDocente {
  anio: number;
  lema: string | null;
  institucion: { nombre: string; codigoModular: string; modalidad: string; nivel: string };
  director: {
    nombre: string;
    dni: string;
    correo: string;
    celular: string;
    encargado: boolean;
    designado: boolean;
    porFunciones: boolean;
  };
  docente: {
    nombre: string;
    dni: string;
    correo: string;
    celular: string;
    contratado: boolean;
    nombrado: boolean;
    otro: boolean;
    modalidad: string;
    nivel: string;
    area: string;
    grado: string;
    seccion: string;
    estudiantes: string;
    nee: string;
  };
  monitor: {
    nombre: string;
    dni: string;
    correo: string;
    celular: string;
    drep: boolean;
    ugel: boolean;
    directorIe: boolean;
    coordinador: boolean;
  };
  fecha: string;
  horaInicio: string;
  horaFinal: string;
  niveles: { romano: string; denominacion: string }[];
  desempenos: DesempenoOficial[];
  planificacion: {
    etiqueta: string;
    numero: number;
    descripcion: string;
    casillas: boolean[];
    evidencias: string;
  }[];
  observaciones: string;
  sugerencias: string;
  compromisos: string;
  consolidado: {
    columnas: { etiqueta: string; puntaje: number | null }[];
    total: number | null;
    promedio: string | null;
    nivel: string | null;
  };
  leyenda: { total: string; promedio: string; nivel: string }[];
  evidencias: string[];
  firmas: { rol: string; nombre: string; fecha: string; imagen: string | null }[];
}

const nombreCompleto = (p: PersonaRaw) => `${p.nombres} ${p.apellidos}`.trim();

/** Fecha sin hora (columna `date`): se lee en UTC para que no retroceda un día en Lima. */
const fechaLarga = (fecha: Date) =>
  fecha.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const fechaCorta = (fecha: Date) =>
  fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Lima',
  });

/** 'HH:mm' en 24 horas a «h:mm a. m./p. m.». */
function horaDe12(hora: number, minuto: number): string {
  const sufijo = hora >= 12 ? 'p. m.' : 'a. m.';
  return `${hora % 12 || 12}:${String(minuto).padStart(2, '0')} ${sufijo}`;
}

function horaDeTexto(hhmmss: string): string {
  const [h, m] = hhmmss.split(':').map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? '' : horaDe12(h, m);
}

function horaDeFecha(fecha: Date | null): string {
  if (!fecha) return '';
  const partes = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Lima',
  }).formatToParts(fecha);
  const h = Number(partes.find((p) => p.type === 'hour')?.value);
  const m = Number(partes.find((p) => p.type === 'minute')?.value);
  return horaDe12(h, m);
}

/** 'LOGRO_ESPERADO' -> 'LOGRO ESPERADO' */
const nivelEnMayusculas = (nivel: string) => nivel.replaceAll('_', ' ').toUpperCase();

const decimalEs = (valor: number, decimales: number) => valor.toFixed(decimales).replace('.', ',');

/**
 * Leyenda del consolidado: franjas de puntaje total por promedio.
 *
 * Con cinco desempeños es la tabla oficial ([5-7], [8-12], [13-17], [18-20]). Con
 * otra cantidad las franjas siguen el mismo corte por promedio, que es como
 * clasifica el baremo vigente.
 */
function leyendaPara(cantidad: number): FichaOficialDocente['leyenda'] {
  const cortes = [
    Math.floor(1.5 * cantidad),
    Math.floor(2.5 * cantidad),
    Math.floor(3.5 * cantidad),
  ];
  const rangos = [
    [cantidad, cortes[0]],
    [cortes[0] + 1, cortes[1]],
    [cortes[1] + 1, cortes[2]],
    [cortes[2] + 1, cantidad * 4],
  ];
  const promedios = ['1 - 1,4', '1,6 - 2,4', '2,6 - 3,4', '3,6 - 4'];
  const niveles = ['INICIO', 'EN PROCESO', 'LOGRO ESPERADO', 'LOGRO DESTACADO'];

  return rangos.map(([desde, hasta], i) => ({
    total: `[${desde} - ${hasta}]`,
    promedio: promedios[i],
    nivel: niveles[i],
  }));
}

function introDeAspectos(cantidad: number): string {
  if (cantidad === 1) return 'El aspecto que se considera en esta rúbrica es el siguiente:';
  const letras = ASPECTOS_EN_LETRAS[cantidad] ?? String(cantidad);
  return `Los aspectos que se consideran en esta rúbrica son ${letras}:`;
}

function celdasDe(indiceNivel: number, elegido: number | null): CeldaDeNivel[] {
  return NIVELES_ROMANOS.map((_, j) => {
    if (j !== indiceNivel) return 'gris';
    return elegido === indiceNivel + 1 ? 'marcada' : 'libre';
  });
}

const casillasDe = (nivel: number | null): boolean[] =>
  NIVELES_ROMANOS.map((_, i) => nivel === i + 1);

/**
 * Asegura que el título del desempeño comience con la numeración oficial «DESEMPEÑO N: NOMBRE».
 * Si el nombre ya trae un prefijo («DESEMPEÑO 1:», «Desempeño 1 -», «1.»),
 * lo normaliza para no duplicar la numeración.
 */
export function formatearTituloDesempeno(numero: number, nombre: string): string {
  const sinPrefijo = (nombre || '')
    .replace(/^(?:desempe[nñ]o\s*\d+\s*[:\-–—.]?|\d+\s*[:\-–—.]\s*)/i, '')
    .trim();
  return sinPrefijo ? `DESEMPEÑO ${numero}: ${sinPrefijo}` : `DESEMPEÑO ${numero}`;
}

export function construirFichaOficialDocente(raw: FichaOficialRaw): FichaOficialDocente {
  const { cronograma, contexto, plantilla } = raw;
  const evaluado = cronograma.evaluado;
  const monitor = cronograma.monitor;
  const director = raw.director;

  const condicionDocente = evaluado.condicionLaboral ?? '';
  const cargoMonitor = monitor.cargo;

  const desempenosOrdenados = [...plantilla.desempenos].sort((a, b) => a.orden - b.orden);
  const ejesOrdenados = [...plantilla.ejesItems].sort((a, b) => a.orden - b.orden);

  const nivelDeDesempeno = new Map(raw.respuestasDesempeno.map((r) => [r.desempenoId, r]));
  const nivelDeEje = new Map(raw.respuestasEjeItem.map((r) => [r.ejeItemId, r]));

  const desempenos: DesempenoOficial[] = desempenosOrdenados.map((d, indice) => {
    const respuesta = nivelDeDesempeno.get(d.id);
    const elegido = respuesta?.nivel ?? null;
    const aspectos = [...d.aspectos].sort((a, b) => a.orden - b.orden).map((a) => a.descripcion);

    const rubrica = NIVELES_ROMANOS.flatMap((romano, i) => {
      const entrada = d.rubrica.find((r) => r.nivelCalificacion.nivelRomano === romano);
      return entrada
        ? [{ romano, descripcion: entrada.descripcion, celdas: celdasDe(i, elegido) }]
        : [];
    });

    const numero = indice + 1;

    return {
      numero,
      nombre: formatearTituloDesempeno(numero, d.nombre),
      descripcion: d.descripcionCorta ?? '',
      introAspectos: introDeAspectos(aspectos.length),
      aspectos,
      rubrica,
      evidencias: respuesta?.observaciones ?? '',
      preguntaExtra: d.preguntaExtra
        ? {
            texto: d.preguntaExtra,
            si: respuesta?.preguntaExtraRespuesta === true,
            no: respuesta?.preguntaExtraRespuesta === false,
          }
        : null,
    };
  });

  const cantidad = desempenosOrdenados.length;

  const planificacion = ejesOrdenados.map((eje, indice) => ({
    etiqueta: `R${cantidad + indice + 1}`,
    numero: cantidad + indice + 1,
    descripcion: eje.descripcion,
    casillas: casillasDe(nivelDeEje.get(eje.id)?.nivel ?? null),
    evidencias: nivelDeEje.get(eje.id)?.observacion ?? '',
  }));

  const columnas = [
    ...desempenosOrdenados.map((d, i) => ({
      etiqueta: `D${i + 1}`,
      puntaje: nivelDeDesempeno.get(d.id)?.nivel ?? null,
    })),
    ...ejesOrdenados.map((e, i) => ({
      etiqueta: `R${cantidad + i + 1}`,
      puntaje: nivelDeEje.get(e.id)?.nivel ?? null,
    })),
  ];

  const ordenDeRol = (rol: string) => (rol === 'EVALUADOR' ? 0 : 1);

  return {
    anio: raw.anioAcademico,
    lema: raw.lema,
    institucion: {
      nombre: cronograma.institucion.nombre,
      codigoModular: cronograma.institucion.codigoModular,
      modalidad: cronograma.institucion.modalidad,
      nivel: cronograma.institucion.nivelEducativo,
    },
    director: {
      nombre: director?.nombre ?? '',
      dni: director?.dni ?? '',
      correo: director?.correo ?? '',
      celular: director?.telefono ?? '',
      encargado: director?.condicion === 'Encargado',
      designado: director?.condicion === 'Designado',
      porFunciones: director?.condicion === 'Por Función',
    },
    docente: {
      nombre: nombreCompleto(evaluado.persona),
      dni: evaluado.persona.dni,
      correo: evaluado.persona.correo ?? '',
      celular: evaluado.persona.telefono ?? '',
      contratado: condicionDocente === 'Contratado',
      nombrado: condicionDocente === 'Nombrado',
      otro:
        !!condicionDocente && condicionDocente !== 'Contratado' && condicionDocente !== 'Nombrado',
      modalidad: evaluado.modalidad ?? cronograma.institucion.modalidad,
      nivel: evaluado.nivelEducativo,
      area: contexto?.areaCurricular ?? '',
      grado: contexto?.grado ?? '',
      seccion: contexto?.seccion ?? '',
      estudiantes: contexto?.cantidadEstudiantes?.toString() ?? '',
      nee: contexto?.cantidadEstudiantesNee?.toString() ?? '',
    },
    monitor: {
      nombre: nombreCompleto(monitor.persona),
      dni: monitor.persona.dni,
      correo: monitor.persona.correo ?? '',
      celular: monitor.persona.telefono ?? '',
      drep: cargoMonitor === CARGO_DREP,
      directorIe: cargoMonitor === CARGO_DIRECTOR,
      coordinador: CARGOS_DE_COORDINACION.includes(cargoMonitor),
      ugel:
        cargoMonitor !== CARGO_DREP &&
        cargoMonitor !== CARGO_DIRECTOR &&
        !CARGOS_DE_COORDINACION.includes(cargoMonitor),
    },
    fecha: fechaLarga(cronograma.fechaProgramada),
    horaInicio: horaDeTexto(cronograma.horaInicio),
    horaFinal: horaDeFecha(raw.finalizadaAt),
    niveles: [...plantilla.niveles]
      .sort((a, b) => a.orden - b.orden)
      .map((n) => ({ romano: n.nivelRomano, denominacion: n.denominacion })),
    desempenos,
    planificacion,
    observaciones: raw.observaciones ?? '',
    sugerencias: raw.sugerencias ?? '',
    compromisos: raw.compromisos ?? '',
    consolidado: {
      columnas,
      total: raw.puntajeTotal,
      promedio: raw.promedio === null ? null : decimalEs(raw.promedio, 2),
      nivel: raw.nivelLogro ? nivelEnMayusculas(raw.nivelLogro) : null,
    },
    leyenda: leyendaPara(cantidad),
    evidencias: raw.evidencias,
    firmas: [...raw.firmas]
      .sort((a, b) => ordenDeRol(a.rolFirmante) - ordenDeRol(b.rolFirmante))
      .map((f) => ({
        rol: f.rolFirmante === 'EVALUADOR' ? 'Monitor' : 'Docente',
        nombre: f.nombre,
        fecha: fechaCorta(f.fecha),
        imagen: f.imagen,
      })),
  };
}
