import { CONDICION_LABORAL, CONDICION_DIRECTIVA } from '@entities/model-docentes';

/**
 * Qué ofrece cada selector del formulario de docente, según el nivel y el cargo.
 *
 * Vivía dentro de `DocenteFormBase`, en cuatro funciones anónimas escritas
 * dentro de los props `options={...}`. Una de ellas —el catálogo de cursos—
 * declaraba entradas para Inicial y Primaria que nunca se leían, porque el
 * selector de esos niveles usaba otra lista distinta escrita en línea: dos
 * fuentes contradictorias para el mismo dato.
 */

export const GRADOS_POR_NIVEL: Record<string, readonly string[]> = {
  INICIAL: ['3 años', '4 años', '5 años'],
  PRIMARIA: ['1°', '2°', '3°', '4°', '5°', '6°'],
  SECUNDARIA: ['1°', '2°', '3°', '4°', '5°'],
};

/** Áreas curriculares por nivel, fuente única del selector de especialidad. */
const ESPECIALIDADES_POR_NIVEL: Record<string, readonly string[]> = {
  INICIAL: ['General'],
  PRIMARIA: ['General', 'PIP', 'Educación Física'],
  SECUNDARIA: [
    'Comunicación',
    'Matemática',
    'Ciencia y Tecnología',
    'Desarrollo Personal, Ciudadanía y Cívica',
    'Ciencias Sociales',
    'Educación Física',
    'Arte y Cultura',
    'Inglés',
    'Educación Religiosa',
    'Educación para el Trabajo',
    'Castellano como Segunda Lengua Materna',
    'Tutoría',
  ],
};

/** Cargos de institución que sólo existen en Secundaria. */
const CARGOS_DE_SECUNDARIA = ['Coordinador Pedagógico', 'Jefe de Taller'] as const;

const DOCENTE_DE_AULA = 'Docente de Aula';

export const gradosDelNivel = (nivel: string): string[] => [...(GRADOS_POR_NIVEL[nivel] ?? [])];

/**
 * Especialidades ofrecidas para el nivel.
 *
 * La especialidad ya registrada se incluye aunque no figure en el catálogo: sin
 * eso el selector se abre vacío y guardar el formulario le borra al docente un
 * dato que sí tenía.
 */
export function especialidadesDelNivel(nivel: string, actual?: string | null): string[] {
  const catalogo = [...(ESPECIALIDADES_POR_NIVEL[nivel] ?? [])];

  const limpia = actual?.trim();
  if (limpia && !catalogo.includes(limpia)) catalogo.push(limpia);

  return catalogo;
}

/** Condiciones laborales que corresponden al cargo. */
export const condicionesDelCargo = (cargo: string): string[] =>
  cargo === 'Director' ? [...CONDICION_DIRECTIVA] : [...CONDICION_LABORAL];

/**
 * Cargos elegibles en el formulario.
 *
 * «Director» no se elige acá, pero si el registro ya lo tiene hay que
 * ofrecerlo: sin eso el selector se abre en otro cargo y guardar degrada al
 * director sin que nadie lo pidiera.
 */
export function cargosDisponibles(nivel: string, cargoActual: string): string[] {
  const disponibles =
    nivel === 'SECUNDARIA' ? [...CARGOS_DE_SECUNDARIA, DOCENTE_DE_AULA] : [DOCENTE_DE_AULA];

  return cargoActual === 'Director' ? ['Director', ...disponibles] : disponibles;
}

export interface SeccionACargo {
  id?: string;
  grado: string;
  seccion: string;
}

interface ResultadoDeAgregar {
  ok: boolean;
  /** La lista nueva, sólo si se agregó. */
  secciones?: SeccionACargo[];
  /** Por qué no se agregó, en texto para el usuario. */
  motivo?: string;
}

/**
 * Suma una sección a la lista, o explica por qué no.
 *
 * Antes cada rechazo era un `return` mudo dentro del manejador del botón: el
 * usuario pulsaba «Añadir», no pasaba nada, y no había forma de saber si el
 * problema era la letra, el grado o que ya estaba puesta.
 */
export function agregarSeccion(
  previas: readonly SeccionACargo[],
  grado: string,
  letra: string,
): ResultadoDeAgregar {
  const gradoLimpio = grado.trim();
  const letraLimpia = letra.trim().toUpperCase();

  if (!gradoLimpio) return { ok: false, motivo: 'Seleccione un grado.' };
  if (!letraLimpia) return { ok: false, motivo: 'Indique la sección.' };
  if (letraLimpia.length !== 1) {
    return { ok: false, motivo: 'La sección se identifica con una sola letra. Ej. A.' };
  }

  const repetida = previas.some(
    (s) => s.grado.toLowerCase() === gradoLimpio.toLowerCase() && s.seccion === letraLimpia,
  );
  if (repetida) {
    return { ok: false, motivo: `${gradoLimpio} «${letraLimpia}» ya está en la lista.` };
  }

  return {
    ok: true,
    secciones: [
      ...previas,
      { id: nuevoId(), grado: gradoLimpio, seccion: letraLimpia },
    ],
  };
}

/** Identificador local, sólo para poder listar y quitar antes de guardar. */
const nuevoId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
