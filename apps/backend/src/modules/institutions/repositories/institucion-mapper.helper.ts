import type { Prisma } from '../../../generated/prisma/client.js';
import { Institucion } from '../entities/institucion.entity.js';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';

type InstitucionWithDirector = Prisma.InstitucionEducativaGetPayload<{
  include: {
    docentes: {
      include: {
        persona: true;
        docenteCargos: {
          include: { cargo: true };
        };
      };
    };
  };
}>;

export const INCLUDE_DOCENTE_DIRECTOR = {
  docentes: {
    include: {
      persona: true,
      docenteCargos: {
        include: { cargo: true },
      },
    },
  },
} as const;

export function mapInstitucion(record: InstitucionWithDirector | null): Institucion {
  if (!record) return record as unknown as Institucion;

  const directorDocente = record.docentes?.find((d) =>
    d.docenteCargos?.some((dc) => dc.cargo?.nombre === CargoNombre.DIRECTOR && !dc.fechaFin),
  );

  return {
    id: record.id,
    codigoModular: record.codigoModular,
    codigoLocal: record.codigoLocal,
    nombre: record.nombre,
    nivelEducativo: record.nivelEducativo,
    departamento: record.departamento,
    provincia: record.provincia,
    distrito: record.distrito,
    direccion: record.direccion,
    zona: record.zona,
    estado: record.estado,
    modalidad: record.modalidad,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    director: directorDocente
      ? `${directorDocente.persona.nombres} ${directorDocente.persona.apellidos}`.trim()
      : null,
    directorTelefono: directorDocente?.persona?.telefono || null,
    directorCorreo: directorDocente?.persona?.correo || null,
    directorDni: directorDocente?.persona?.dni || null,
  };
}
