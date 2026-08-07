import { useState } from 'react';
import { CARGA_HORARIA } from '@shared/config/constants';
import type { Docente, NivelEducativo } from '@entities/model-docentes';
import type { DocenteFormData } from '@entities/model-docentes/validator';
import { teachersApi } from '@shared/api/teachers.api';
import type { IDocenteResponse } from '@sistema-monitoreo/shared-contracts';
import { aFechaISOLocal, hoyISO } from '@shared/lib/fecha/fecha';

export const fetchDocentes = async (): Promise<Docente[]> => {
  const res = await teachersApi.findAll();
  if (res.ok && res.data) {
    return res.data.map(mapApiDocenteToFrontend);
  }
  return [];
};

export const fetchCargos = async () => {
  return teachersApi.getCargos();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateDocenteRaw = async (id: string, dto: any) => {
  return teachersApi.update(id, dto);
};

export const fetchDocenteByDni = async (dni: string): Promise<Docente | null> => {
  const res = await teachersApi.findByDni(dni);
  if (res.ok && res.data) {
    return mapApiDocenteToFrontend(res.data as IDocenteResponse);
  }
  return null;
};

export const fetchDocenteById = async (id: string): Promise<Docente | null> => {
  const docentes = await fetchDocentes();
  return docentes.find((d) => d.id === id) ?? null;
};

const MAP_ROMAN_TO_INT: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

const MAP_INT_TO_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
};

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const mapApiDocenteToFrontend = (apiDoc: IDocenteResponse): Docente => {
  const cargosList = apiDoc.docenteCargos?.map((dc) => ({
    id: dc.id,
    nombre: dc.cargo?.nombre || 'Docente de Aula',
    fechaInicio: dc.fechaInicio ? aFechaISOLocal(dc.fechaInicio) : '',
    fechaFin: dc.fechaFin ? aFechaISOLocal(dc.fechaFin) : null,
    esPrincipal: dc.esPrincipal || false,
  })) || [];

  const activeCargo = cargosList.find((c) => c.fechaFin === null && c.esPrincipal) ||
                      cargosList.find((c) => c.fechaFin === null);
  const cargoName = activeCargo?.nombre || 'Docente de Aula';

  return {
    id: apiDoc.id,
    nombres: apiDoc.persona.nombres,
    apellidos: apiDoc.persona.apellidos,
    dni: apiDoc.persona.dni,
    correo: apiDoc.persona.correo || '',
    celular: apiDoc.persona.telefono || '',
    nivelEducativo: (apiDoc.nivelEducativo?.toUpperCase() || 'PRIMARIA') as NivelEducativo,
    condicion: (cargoName === 'Director' && (!apiDoc.condicionLaboral || apiDoc.condicionLaboral === 'Nombrado')
      ? 'Designado'
      : (apiDoc.condicionLaboral || 'Nombrado')) as Docente['condicion'],
    especialidad: apiDoc.cursoAsignado || 'General',
    cargaHoraria: CARGA_HORARIA.DOCENTE,
    secciones:
      apiDoc.docenteSecciones?.map((ds) => ({
        id: ds.id,
        grado: ds.grado,
        seccion: ds.seccion,
      })) || [],
    escala: (apiDoc.escalaMagisterial
      ? MAP_INT_TO_ROMAN[apiDoc.escalaMagisterial]
      : 'I') as Docente['escala'],
    institucionId: apiDoc.institucionId,
    activo: apiDoc.estado === 'Activo',
    fechaCreacion: apiDoc.createdAt
      ? aFechaISOLocal(apiDoc.createdAt)
      : hoyISO(),
    cargo: cargoName as Docente['cargo'],
    cargosList,
    evaluadorActual: apiDoc.evaluadorActual || null,
  };
};

export const useDocenteService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDocente = async (formData: DocenteFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Obtener el ID de cargo dinámicamente desde el backend
      const cargosRes = await teachersApi.getCargos();
      if (!cargosRes.ok || !cargosRes.data) {
        throw new Error('No se pudo obtener el catálogo de cargos de la base de datos.');
      }
      const dbCargo = cargosRes.data.find((c) => c.nombre === formData.cargo);
      if (!dbCargo) {
        throw new Error(`El cargo ${formData.cargo} no existe en el catálogo de cargos.`);
      }

      const dto = {
        dni: formData.dni,
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo.trim() || undefined,
        telefono: formData.celular.trim() || undefined,
        institucionId: formData.institucionId,
        gradoAcademico: 'Licenciado',
        nivelEducativo: toTitleCase(formData.nivelEducativo),
        cursoAsignado: formData.especialidad?.trim() || 'General',
        cargoId: dbCargo.id,
        condicionLaboral: formData.condicion,
        escalaMagisterial: MAP_ROMAN_TO_INT[formData.escala] || 1,
        secciones: formData.secciones?.map((s) => ({
          grado: s.grado,
          seccion: s.seccion.toUpperCase().trim(),
        })),
      };

      const res = await teachersApi.create(dto);
      if (res.ok && res.data) {
        const mapped = mapApiDocenteToFrontend(res.data);
        return { success: true, data: mapped };
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al registrar el docente.';
        setError(errMsg);
        return { success: false, error: res.error };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al registrar el docente.';
      setError(errMsg);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateDocente = async (id: string, formData: DocenteFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Obtener el ID de cargo dinámicamente desde el backend
      const cargosRes = await teachersApi.getCargos();
      if (!cargosRes.ok || !cargosRes.data) {
        throw new Error('No se pudo obtener el catálogo de cargos de la base de datos.');
      }
      const dbCargo = cargosRes.data.find((c) => c.nombre === formData.cargo);
      if (!dbCargo) {
        throw new Error(`El cargo ${formData.cargo} no existe en el catálogo de cargos.`);
      }

      const dto = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo.trim() || undefined,
        telefono: formData.celular.trim() || undefined,
        gradoAcademico: 'Licenciado',
        nivelEducativo: toTitleCase(formData.nivelEducativo),
        cursoAsignado: formData.especialidad?.trim() || 'General',
        cargoId: dbCargo.id,
        condicionLaboral: formData.condicion,
        escalaMagisterial: MAP_ROMAN_TO_INT[formData.escala] || 1,
        institucionId: formData.institucionId,
        secciones: formData.secciones?.map((s) => ({
          grado: s.grado,
          seccion: s.seccion.toUpperCase().trim(),
        })),
      };

      const res = await teachersApi.update(id, dto);
      if (res.ok && res.data) {
        const mapped = mapApiDocenteToFrontend(res.data);
        return { success: true, data: mapped };
      } else {
        const errMsg =
          (res.error as { message?: string })?.message ||
          'Error al actualizar el registro del docente.';
        setError(errMsg);
        return { success: false, error: res.error };
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Error al actualizar el registro del docente.';
      setError(errMsg);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { createDocente, updateDocente, loading, error };
};
