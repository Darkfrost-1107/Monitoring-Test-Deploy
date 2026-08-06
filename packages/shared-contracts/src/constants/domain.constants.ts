// El tipo `UserRole` vivía aquí declarando 'ADMIN' | 'SPECIALIST' | 'DIRECTOR' |
// 'TEACHER' y documentándose como "matching the Prisma UserRole enum". Ese enum
// existió en la migración inicial (20260530062223_init) y fue retirado por la
// normalización posterior, que modeló los roles como tabla `Role` con columna
// `codigo` en snake_case. El tipo quedó describiendo un modelo de datos que ya no
// existe, y ningún consumidor del frontend llegó a importarlo.
//
// La declaración canónica vive ahora en `./roles.constants.js`.

export const ModalidadEducativa = {
  EBR: 'EBR',
  EBA: 'EBA',
  EBE: 'EBE',
  CEPTRO: 'CEPTRO',
} as const;

export const NivelEducativoEBR = {
  INICIAL: 'Inicial',
  PRIMARIA: 'Primaria',
  SECUNDARIA: 'Secundaria',
} as const;

export const NivelEducativoEBA = {
  INICIAL_INTERMEDIO: 'Inicial-Intermedio',
  AVANZADO: 'Avanzado',
} as const;

export const NivelEducativoEBE = {
  CEBE: 'CEBE',
  PRITE: 'PRITE',
} as const;

export const NivelEducativoCEPTRO = {
  CORTE_ENSAMBLAJE: 'Corte y Ensamblaje',
  MECANICA_MOTOS: 'Mecánica de Motos y Vehículos Afines',
  PELUQUERIA_BARBERIA: 'Peluquería y barbería',
  MADERA: 'Fabricación artesanal de productos de madera',
  TI: 'Plataformas y servicios de tecnologías de la información',
} as const;

export const EspecialidadPrimaria = {
  PIP: 'PIP',
  EDUCACION_FISICA: 'Educación Física',
} as const;

export const DocenteCargosRestrictivos = {
  COORDINADOR_PEDAGOGICO: 'Coordinador Pedagógico',
  JEFE_DE_TALLER: 'Jefe de Taller',
} as const;

/** Condición laboral válida para cargos de responsabilidad (Coordinador Pedagógico y Jefe de Taller) */
export const CondicionLaboralCargosRestrictivos = ['Nombrado', 'Destacado'] as const;

/** @deprecated Usar CondicionLaboralCargosRestrictivos */
export const CondicionLaboralPermitidaCoordinador = CondicionLaboralCargosRestrictivos;

/** Los tres cargos válidos para la tabla Especialista */
export const CargoEspecialista = {
  ESPECIALISTA: 'Especialista',
  JEFE_AREA: 'Jefe de Área',
  JEFE_GESTION: 'Jefe de Gestión',
} as const;

export const CondicionLaboralEspecialista = ['Encargado', 'Destacado', 'Designado'] as const;

/** Áreas curriculares por nivel educativo */
export const AREAS_CURRICULARES: Record<string, string[]> = {
  INICIAL: [
    'Personal Social', 'Psicomotricidad', 'Comunicación',
    'Descubrimiento del Mundo', 'Todas las áreas (Inicial)',
  ],
  PRIMARIA: [
    'Comunicación', 'Matemática', 'Ciencia y Tecnología',
    'Personal Social', 'Arte y Cultura', 'Educación Física',
    'Educación Religiosa',
  ],
  SECUNDARIA: [
    'Comunicación', 'Matemática', 'Ciencia y Tecnología',
    'Desarrollo Personal, Ciudadanía y Cívica', 'Ciencias Sociales',
    'Educación Física', 'Arte y Cultura', 'Inglés',
    'Educación Religiosa', 'Educación para el Trabajo',
  ],
  EBA: ['Comunicación', 'Matemática', 'Ciencia, Tecnología y Salud', 'Ciencias Sociales'],
  EBE: ['Comunicación', 'Matemática', 'Personal Social', 'Psicomotricidad'],
  CEPTRO: [
    'Corte y Ensamblaje de Materiales', 'Mecánica de Motos',
    'Peluquería y Barbería', 'Instalaciones Eléctricas',
    'Carpintería', 'Industria Alimentaria',
  ],
};

export const MODALIDAD_NIVEL_MAP: Record<string, string[]> = {
  [ModalidadEducativa.EBR]: Object.values(NivelEducativoEBR),
  [ModalidadEducativa.EBA]: Object.values(NivelEducativoEBA),
  [ModalidadEducativa.EBE]: Object.values(NivelEducativoEBE),
  [ModalidadEducativa.CEPTRO]: Object.values(NivelEducativoCEPTRO),
};
