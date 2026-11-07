import type { Prisma } from '../../../generated/prisma/client.js';
import type { IEspecialistaResponse } from '@sistema-monitoreo/shared-contracts';

export type EspecialistaWithRelations = Prisma.EspecialistaGetPayload<{
  include: {
    persona: {
      include: {
        usuario: { include: { rol: true } };
      };
    };
    especialidades: { include: { especialidad: true } };
    cargos: true;
  };
}>;

export const ESPECIALISTA_INCLUDE = {
  persona: {
    include: {
      usuario: { include: { rol: true } },
    },
  },
  especialidades: { include: { especialidad: true } },
  cargos: true,
} as const;

export function mapEspecialista(esp: EspecialistaWithRelations): IEspecialistaResponse {
  const especialidadesList = esp.especialidades || [];
  const mainRelation = especialidadesList.find((e) => e.esPrincipal);
  const extraRelations = especialidadesList.filter((e) => !e.esPrincipal);

  const cargoActivo = (esp.cargos || []).find((c) => c.fechaFin === null);
  const cargoEfectivo = cargoActivo?.cargo ?? 'Especialista';

  return {
    id: esp.id,
    personaId: esp.personaId,
    especialidades: especialidadesList.map((e) => e.especialidad?.nombre).filter(Boolean),
    especialidad: mainRelation?.especialidad?.nombre || null,
    especialidadesExtras: extraRelations.map((e) => e.especialidad?.nombre).filter(Boolean),
    nivelEducativo: esp.nivelEducativo,
    modalidad: esp.modalidad ?? null,
    estado: esp.estado,
    contrasenaInicial: esp.persona.usuario?.isFirstLogin,
    cargaLaboral: esp.cargaLaboral,
    cargo: cargoEfectivo,
    condicionLaboral: esp.condicionLaboral ?? null,
    escalaMagisterial: esp.escalaMagisterial,
    createdAt: esp.createdAt,
    updatedAt: esp.updatedAt,
    persona: {
      id: esp.persona.id,
      dni: esp.persona.dni,
      nombres: esp.persona.nombres,
      apellidos: esp.persona.apellidos,
      correo: esp.persona.correo,
      telefono: esp.persona.telefono,
    },
    user: esp.persona.usuario
      ? {
          id: esp.persona.usuario.id,
          role: {
            code: esp.persona.usuario.rol.codigo,
            name: esp.persona.usuario.rol.nombre,
          },
        }
      : undefined,
  };
}
