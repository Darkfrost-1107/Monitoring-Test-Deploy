import type { Baremo, NivelRomano } from './model';

export const TIPOS_MONITOREO = ['Monitoreo Docente', 'Monitoreo Docente EIB', 'Monitoreo Directivo'] as const;

export const BAREMOS: { value: Baremo; label: string }[] = [
  { value: 'Vigente', label: 'Vigente (0-20)' },
  { value: 'Porcentual', label: 'Porcentual (%)' },
];

export const NIVELES_ROMANOS: NivelRomano[] = ['I', 'II', 'III', 'IV'];

// Niveles por defecto de la escala (como en el mockup).
// La escala por defecto vive en `escala-por-defecto.ts`: depende del tipo de
// monitoreo, porque la rúbrica docente y la directiva cortan distinto. Acá había
// una sola —0/11/15/18, «Muy Insatisfactorio…»— que no salía de ningún documento
// oficial y pasó inadvertida mientras el motor ignoraba `rangoMin`.
