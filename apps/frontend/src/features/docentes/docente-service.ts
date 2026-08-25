import { useState } from 'react';
import { CARGA_HORARIA } from '@shared/config/constants';
import type { Docente, NivelEducativo } from '@entities/model-docentes';
import type { DocenteFormData } from '@entities/model-docentes/validator';
import { teachersApi } from '@shared/api/teachers.api';
import type { IDocenteResponse } from '@sistema-monitoreo/shared-contracts';
import { aFechaISOLocal } from '@shared/lib/fecha/fecha';
import { escalaARomano, escalaANumero } from '@entities/model-docentes/escala';

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
    personaId: apiDoc.personaId,
    nombres: apiDoc.persona.nombres,
    apellidos: apiDoc.persona.apellidos,
    dni: apiDoc.persona.dni,
    correo: apiDoc.persona.correo || '',
    celular: apiDoc.persona.telefono || '',
    nivelEducativo: (apiDoc.nivelEducativo?.toUpperCase() || 'PRIMARIA') as NivelEducativo,
    condicion: (cargoName === 'Director' && (!apiDoc.condicionLaboral || apiDoc.condicionLaboral === 'Nombrado')
      ? 'Designado'
      : (apiDoc.condicionLaboral || 'Nombrado')) as Docente['condicion'],
    // La especialidad canónica es la relación `docente_especialidades` (lo que
    // el backend valida al programar en Secundaria), que viaja en `especialidad`.
    // `cursoAsignado` queda de respaldo para registros que aún no la tienen.
    especialidad: apiDoc.especialidad || apiDoc.cursoAsignado || 'General',
    especialidadesExtras: apiDoc.especialidadesExtras ?? [],
    cargaHoraria: CARGA_HORARIA.DOCENTE,
    secciones:
      apiDoc.docenteSecciones?.map((ds) => ({
        id: ds.id,
        grado: ds.grado,
        seccion: ds.seccion,
      })) || [],
    // Nula cuando el docente no tiene escala declarada, que hoy es el caso de
    // los 869 registros. Antes se devolvía 'I': una escala inventada que la
    // pantalla de asignación reenviaba a la base como un 1 real.
    escala: escalaARomano(apiDoc.escalaMagisterial),
    institucionId: apiDoc.institucionId,
    activo: apiDoc.estado === 'Activo',
    // Vacía si el registro no la trae; poner la de hoy sería afirmar una fecha
    // de alta que nadie registró.
    fechaCreacion: apiDoc.createdAt ? aFechaISOLocal(apiDoc.createdAt) : '',
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
        // Se envía también como especialidad para mantener sincronizada la
        // relación `docente_especialidades`: sin esto, editar un docente la
        // borraba (el helper de update la reescribe desde este campo) y en
        // Secundaria el monitoreo por área dejaba de reconocerlo.
        especialidad: formData.especialidad?.trim() || undefined,
        // Áreas adicionales (Secundaria): el docente que cubre más de una área.
        especialidadesExtras: (formData.especialidadesExtras ?? [])
          .map((e) => e.trim())
          .filter(Boolean),
        cargoId: dbCargo.id,
        condicionLaboral: formData.condicion,
        escalaMagisterial: escalaANumero(formData.escala) ?? undefined,
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
        // Se envía también como especialidad para mantener sincronizada la
        // relación `docente_especialidades`: sin esto, editar un docente la
        // borraba (el helper de update la reescribe desde este campo) y en
        // Secundaria el monitoreo por área dejaba de reconocerlo.
        especialidad: formData.especialidad?.trim() || undefined,
        // Áreas adicionales (Secundaria): el docente que cubre más de una área.
        especialidadesExtras: (formData.especialidadesExtras ?? [])
          .map((e) => e.trim())
          .filter(Boolean),
        cargoId: dbCargo.id,
        condicionLaboral: formData.condicion,
        escalaMagisterial: escalaANumero(formData.escala) ?? undefined,
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
