import { useState } from 'react';
import { CARGA_HORARIA } from '@shared/config/constants';
import type { JefeArea } from '@entities/model-jefes-area';
import type { JefeAreaFormData } from '@entities/model-jefes-area/validator';
import { jefesAreaApi } from '@shared/api/jefes-area.api';
import type { IEspecialistaResponse as IJefeAreaResponse, IQueryEspecialistaRequest } from '@sistema-monitoreo/shared-contracts';
import { aFechaISOLocal } from '@shared/lib/fecha/fecha';
import { normalizarNivel } from './lib/niveles-jefe-area';

export const fetchJefesArea = async (query?: IQueryEspecialistaRequest): Promise<JefeArea[]> => {
  const res = await jefesAreaApi.findAll(query);
  if (res.ok && res.data) {
    return res.data.map(mapApiJefeAreaToFrontend);
  }
  return [];
};

export const fetchJefeAreaById = async (id: string): Promise<JefeArea | null> => {
  const res = await jefesAreaApi.findById(id);
  if (res.ok && res.data) {
    return mapApiJefeAreaToFrontend(res.data);
  }
  return null;
};

export const mapApiJefeAreaToFrontend = (apiJefe: IJefeAreaResponse): JefeArea => {
  return {
    id: apiJefe.id,
    personaId: apiJefe.personaId,
    nombres: apiJefe.persona.nombres,
    apellidos: apiJefe.persona.apellidos,
    dni: apiJefe.persona.dni,
    correo: apiJefe.persona.correo || '',
    celular: apiJefe.persona.telefono || '',
    cargaHoraria: apiJefe.cargaLaboral || CARGA_HORARIA.JEFE_AREA,
    nivelEducativo: normalizarNivel(apiJefe.nivelEducativo),
    activo: apiJefe.estado === 'Activo',
    // Vacía si el registro no la trae: poner la de hoy sería afirmar una fecha
    // de alta que nadie registró.
    fechaCreacion: apiJefe.createdAt ? aFechaISOLocal(apiJefe.createdAt) : '',
    cargo: apiJefe.cargo || 'Jefe de Área',
    especialidades: apiJefe.especialidades || [],
    especialidad: apiJefe.especialidad || null,
    especialidadesExtras: apiJefe.especialidadesExtras || [],
  };
};

export const useJefeAreaService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createJefeArea = async (
    formData: {
      nivelEducativo: 'Inicial' | 'Primaria' | 'Secundaria';
      specialistId: string;
      nombres: string;
      apellidos: string;
      correo?: string;
      celular?: string;
      cargaHoraria?: number;
    },
    rolCode: string = 'jefe_area',
  ) => {
    setLoading(true);
    setError(null);

    try {
      const dto = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo?.trim() || undefined,
        telefono: formData.celular?.trim() || undefined,
        cargaHoraria: CARGA_HORARIA.JEFE_AREA, // Jefe de Área tiene carga laboral obligatoria de 40 horas
        nivelEducativo: formData.nivelEducativo,
        rolCode,
      };

      // Promovemos al especialista existente utilizando jefesAreaApi.update
      const res = await jefesAreaApi.update(formData.specialistId, dto);
      if (res.ok && res.data) {
        const mapped = mapApiJefeAreaToFrontend(res.data);
        return { success: true, data: mapped };
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al registrar el jefe de área.';
        setError(errMsg);
        return { success: false, error: res.error };
      }
    } catch (err) {
      setError('Error al registrar el jefe de área.');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateJefeArea = async (
    id: string,
    formData: JefeAreaFormData,
    rolCode: string = 'jefe_area',
  ) => {
    setLoading(true);
    setError(null);

    try {
      const dto = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo?.trim() || undefined,
        telefono: formData.celular?.trim() || undefined,
        cargaHoraria: formData.cargaHoraria,
        nivelEducativo: formData.nivelEducativo,
        estado: (formData.activo ?? true) ? 'Activo' : 'Inactivo',
        rolCode,
      };

      const res = await jefesAreaApi.update(id, dto);
      if (res.ok && res.data) {
        const mapped = mapApiJefeAreaToFrontend(res.data);
        return { success: true, data: mapped };
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al actualizar el jefe de área.';
        setError(errMsg);
        return { success: false, error: res.error };
      }
    } catch (err) {
      setError('Error al actualizar el jefe de área.');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { createJefeArea, updateJefeArea, loading, error };
};
