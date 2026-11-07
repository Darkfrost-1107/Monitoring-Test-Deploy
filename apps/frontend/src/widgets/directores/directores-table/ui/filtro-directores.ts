import type { Docente } from '@entities/model-docentes';
import { MODALIDAD_NIVEL_MAP } from '@entities/model-instituciones';
import { tieneElCargo } from '@features/docentes/lib/padron-docentes';

/**
 * Quién aparece en la tabla de directores.
 *
 * Vive aparte del componente porque exportar una función desde un archivo de
 * componentes rompe el fast refresh de Vite, y porque una regla de negocio se
 * prueba mejor sin montar la tabla entera.
 */

export const directivoFilter = (
  cargo: 'Director' | 'Subdirector',
  dir: Docente,
  params: URLSearchParams,
  getInstName?: (id: string) => string,
) => {
  if (!tieneElCargo(dir, cargo)) return false;

  const searchQuery = params.get('search') || '';
  const instName = getInstName ? getInstName(dir.institucionId) : '';
  const matchSearch =
    !searchQuery ||
    dir.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dir.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dir.dni.includes(searchQuery) ||
    (Boolean(instName) && instName.toLowerCase().includes(searchQuery.toLowerCase()));

  const condicion = params.get('condicion') || '';
  const matchCondicion =
    !condicion || (dir.condicion ?? '').toLowerCase() === condicion.toLowerCase();

  const nivel = params.get('nivelEducativo') || '';
  const matchNivel =
    !nivel || (dir.nivelEducativo ?? '').toLowerCase() === nivel.toLowerCase();

  // El padrón no guarda la modalidad del directivo, pero cada nivel pertenece a
  // una sola: se deduce del mapa en vez de agregar un campo que ya está implícito.
  const modalidad = params.get('modalidad') || '';
  const nivelesDeLaModalidad = (MODALIDAD_NIVEL_MAP[modalidad] ?? []).map((n) => n.toLowerCase());
  const matchModalidad =
    !modalidad || nivelesDeLaModalidad.includes((dir.nivelEducativo ?? '').toLowerCase());

  return matchSearch && matchCondicion && matchNivel && matchModalidad;
};

export const directorFilter = (
  dir: Docente,
  params: URLSearchParams,
  getInstName?: (id: string) => string,
) => directivoFilter('Director', dir, params, getInstName);

export const subdirectorFilter = (
  dir: Docente,
  params: URLSearchParams,
  getInstName?: (id: string) => string,
) => directivoFilter('Subdirector', dir, params, getInstName);

