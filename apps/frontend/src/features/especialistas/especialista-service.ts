import { useState } from 'react';
import type { Especialista } from '@entities/model-especialistas';
import type { EspecialistaFormData } from '@entities/model-especialistas/validator';
import { especialistasApi } from '@shared/api/especialistas.api';
import type { IEspecialistaResponse, IQueryEspecialistaRequest } from '@sistema-monitoreo/shared-contracts';
import { aFechaISOLocal, hoyISO } from '@shared/lib/fecha/fecha';

export const fetchEspecialistas = async (query?: IQueryEspecialistaRequest): Promise<Especialista[]> => {
  const res = await especialistasApi.findAll(query);
  if (res.ok && res.data) {
    return res.data.map(mapApiEspecialistaToFrontend);
  }
  return [];
};

export const fetchEspecialistaById = async (id: string): Promise<Especialista | null> => {
  const res = await especialistasApi.findById(id);
  if (res.ok && res.data) {
    return mapApiEspecialistaToFrontend(res.data);
  }
  return null;
};

export const mapApiEspecialistaToFrontend = (apiEsp: IEspecialistaResponse): Especialista => {
  return {
    id: apiEsp.id,
    personaId: apiEsp.personaId,
    nombres: apiEsp.persona.nombres,
    apellidos: apiEsp.persona.apellidos,
    dni: apiEsp.persona.dni,
    correo: apiEsp.persona.correo || '',
    celular: apiEsp.persona.telefono || '',
    especialidades: apiEsp.especialidades || [],
    especialidad: apiEsp.especialidad || '',
    especialidadesExtras: apiEsp.especialidadesExtras || [],
    nivelEducativo: apiEsp.nivelEducativo,
    modalidad: apiEsp.modalidad || 'EBR',
    estado: apiEsp.estado,
    activo: apiEsp.estado === 'Activo',
    fechaCreacion: apiEsp.createdAt
      ? aFechaISOLocal(apiEsp.createdAt)
      : hoyISO(),
    condicionLaboral: apiEsp.condicionLaboral || 'Encargado',
    cargaLaboral: apiEsp.cargaLaboral || 40,
    escalaMagisterial: apiEsp.escalaMagisterial ?? undefined,
    cargo: apiEsp.cargo,
    rolCode: apiEsp.user?.role?.code,
  };
};

export const useEspecialistaService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEspecialista = async (
    formData: EspecialistaFormData,
    rolCode: string = 'especialista',
    cargo: string = 'Especialista',
  ) => {
    setLoading(true);
    setError(null);

    try {
      const dto = {
        dni: formData.dni,
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo?.trim() || undefined,
        telefono: formData.celular?.trim() || undefined,
        especialidades: formData.especialidades || undefined,
        especialidad: formData.especialidad?.trim() || undefined,
        especialidadesExtras: formData.especialidadesExtras || undefined,
        nivelEducativo: formData.nivelEducativo,
        modalidad: formData.modalidad,
        rolCode,
        cargo,
        condicionLaboral: formData.condicionLaboral,
        cargaLaboral: formData.cargaLaboral,
        escalaMagisterial: formData.escalaMagisterial,
      };

      const res = await especialistasApi.create(dto);
      if (res.ok && res.data) {
        const mapped = mapApiEspecialistaToFrontend(res.data);
        return { success: true, data: mapped };
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al registrar el especialista.';
        setError(errMsg);
        return { success: false, error: res.error };
      }
    } catch (err) {
      setError('Error al registrar el especialista.');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateEspecialista = async (
    id: string,
    formData: EspecialistaFormData,
    rolCode: string = 'especialista',
    cargo: string = 'Especialista',
  ) => {
    setLoading(true);
    setError(null);

    try {
      const dto = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo?.trim() || undefined,
        telefono: formData.celular?.trim() || undefined,
        especialidades: formData.especialidades || undefined,
        especialidad: formData.especialidad?.trim() || undefined,
        especialidadesExtras: formData.especialidadesExtras || undefined,
        nivelEducativo: formData.nivelEducativo,
        modalidad: formData.modalidad,
        estado: (formData.activo ?? true) ? 'Activo' : 'Inactivo',
        rolCode,
        cargo,
        condicionLaboral: formData.condicionLaboral,
        cargaLaboral: formData.cargaLaboral,
        escalaMagisterial: formData.escalaMagisterial,
      };

      const res = await especialistasApi.update(id, dto);
      if (res.ok && res.data) {
        const mapped = mapApiEspecialistaToFrontend(res.data);
        return { success: true, data: mapped };
      } else {
        const errMsg =
          (res.error as { message?: string })?.message || 'Error al actualizar el especialista.';
        setError(errMsg);
        return { success: false, error: res.error };
      }
    } catch (err) {
      setError('Error al actualizar el especialista.');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  return { createEspecialista, updateEspecialista, loading, error };
};
