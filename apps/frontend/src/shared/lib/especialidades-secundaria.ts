/**
 * Áreas curriculares oficiales de Secundaria (R.M. N° 649-2016-MINEDU / CNEB).
 *
 * Única fuente para los formularios de docente y de especialista. Antes cada
 * uno tenía su propio catálogo, y el backend guarda la especialidad con un
 * upsert por nombre exacto (`especialista-create.helper.ts`): "Ciencia y
 * Tecnología" y "CTA" quedaban como dos filas distintas del catálogo y nunca
 * se cruzaban entre un docente y el especialista que lo evalúa.
 */
export const ESPECIALIDADES_DE_SECUNDARIA = [
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
] as const;

/** Sin tildes ni mayúsculas: compara «Comunicacion» y «Comunicación» como la misma área. */
export const normalizarArea = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** ¿El área ya está tomada por la principal o alguna extra (ignorando tildes)? */
export const areaYaUsada = (
  valor: string,
  principal: string | null | undefined,
  extras: readonly string[],
): boolean =>
  [principal, ...extras].some(
    (s) => Boolean(s) && normalizarArea(s as string) === normalizarArea(valor),
  );
