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

export const directorFilter = (dir: Docente, params: URLSearchParams) => {
  // Sólo quien dirige hoy. Antes bastaba con tener alguna designación de
  // Director, cerrada o no, así que un cesado seguía figurando en la tabla de
  // directores —el puesto que acababa de dejar—. Cesar no lo hace desaparecer
  // del sistema: al quedarse sin designación abierta pasa a listarse como
  // docente de aula, que es donde corresponde y desde donde se lo puede volver
  // a designar.
  //
  // La condición se delega en `tieneElCargo`, la misma que usa el padrón de
  // docentes. Acá estaba escrita a mano y omitía `fechaFin`: dos versiones de
  // una regla que debía ser una sola.
  if (!tieneElCargo(dir, 'Director')) return false;

  const searchQuery = params.get('search') || '';
  const matchSearch =
    !searchQuery ||
    dir.nombres.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dir.apellidos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dir.dni.includes(searchQuery);

  const condicion = params.get('condicion') || '';
  const matchCondicion =
    !condicion || (dir.condicion ?? '').toLowerCase() === condicion.toLowerCase();

  const nivel = params.get('nivelEducativo') || '';
  const matchNivel =
    !nivel || (dir.nivelEducativo ?? '').toLowerCase() === nivel.toLowerCase();

  // El padrón no guarda la modalidad del director, pero cada nivel pertenece a
  // una sola: se deduce del mapa en vez de agregar un campo que ya está implícito.
  const modalidad = params.get('modalidad') || '';
  const nivelesDeLaModalidad = (MODALIDAD_NIVEL_MAP[modalidad] ?? []).map((n) => n.toLowerCase());
  const matchModalidad =
    !modalidad || nivelesDeLaModalidad.includes((dir.nivelEducativo ?? '').toLowerCase());

  return matchSearch && matchCondicion && matchNivel && matchModalidad;
};

