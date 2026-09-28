import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type {
  IEspecialistaResponse,
  ICreateEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';
import { CondicionLaboral } from '../../../common/enums/condicion-laboral.enum.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import { mapEspecialista, ESPECIALISTA_INCLUDE } from './especialista-mapper.helper.js';

export async function create(
  prisma: PrismaService,
  data: ICreateEspecialistaRequest,
  passwordHash: string,
  roleId: string,
): Promise<IEspecialistaResponse> {
  return await prisma.$transaction(async (tx) => {
    if (data.cargo === (CargoNombre.JEFE_AREA as string)) {
      const existingJefe = await tx.especialista.findFirst({
        where: {
          nivelEducativo: data.nivelEducativo,
          cargo: CargoNombre.JEFE_AREA,
          estado: EstadoRegistro.ACTIVO,
        },
      });
      if (existingJefe) {
        throw new ConflictException(
          `Ya existe un Responsable de Nivel activo para el nivel ${data.nivelEducativo}.`,
        );
      }
    }

    const existingPersona = await tx.persona.findUnique({
      where: { dni: data.dni },
      include: { especialista: true, usuario: true },
    });

    let persona: { id: string };
    if (existingPersona) {
      if (existingPersona.especialista) {
        throw new ConflictException(
          `La persona con DNI ${data.dni} ya está registrada como Especialista/Jefe. No se puede crear un nuevo registro.`,
        );
      }
      persona = await tx.persona.update({
        where: { id: existingPersona.id },
        data: {
          nombres: data.nombres,
          apellidos: data.apellidos,
          correo: data.correo || null,
          telefono: data.telefono || null,
        },
      });

      if (!existingPersona.usuario) {
        await tx.usuario.create({
          data: {
            personaId: persona.id,
            rolId: roleId,
            passwordHash,
            isActive: true,
            isFirstLogin: true,
          },
        });
      }
    } else {
      persona = await tx.persona.create({
        data: {
          dni: data.dni,
          nombres: data.nombres,
          apellidos: data.apellidos,
          correo: data.correo || null,
          telefono: data.telefono || null,
        },
      });

      await tx.usuario.create({
        data: {
          personaId: persona.id,
          rolId: roleId,
          passwordHash,
          isActive: true,
          isFirstLogin: true,
        },
      });
    }

    const especialista = await tx.especialista.create({
      data: {
        personaId: persona.id,
        nivelEducativo: data.nivelEducativo,
        estado: EstadoRegistro.ACTIVO,
        cargo: data.cargo || CargoNombre.ESPECIALISTA,
        condicionLaboral: data.condicionLaboral || CondicionLaboral.NOMBRADO,
        cargaLaboral: data.cargaLaboral ?? 40,
        escalaMagisterial: data.escalaMagisterial ?? null,
      },
    });

    const cargoInicial = data.cargo || CargoNombre.ESPECIALISTA;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (cargoInicial !== CargoNombre.ESPECIALISTA) {
      await tx.especialistaCargo.create({
        data: {
          id: randomUUID(),
          especialistaId: especialista.id,
          cargo: cargoInicial,
          fechaInicio: new Date(),
          fechaFin: null,
          esPrincipal: true,
        },
      });
    }

    const specialtiesToCreate: { nombre: string; esPrincipal: boolean }[] = [];

    if (data.especialidad) {
      specialtiesToCreate.push({ nombre: data.especialidad.trim(), esPrincipal: true });
    }

    if (data.especialidadesExtras && data.especialidadesExtras.length > 0) {
      for (const extra of data.especialidadesExtras) {
        const trimmed = extra.trim();
        if (
          trimmed &&
          !specialtiesToCreate.some((s) => s.nombre.toLowerCase() === trimmed.toLowerCase())
        ) {
          specialtiesToCreate.push({ nombre: trimmed, esPrincipal: false });
        }
      }
    }

    if (specialtiesToCreate.length === 0 && data.especialidades && data.especialidades.length > 0) {
      data.especialidades.forEach((espNombre, idx) => {
        const trimmed = espNombre.trim();
        if (
          trimmed &&
          !specialtiesToCreate.some((s) => s.nombre.toLowerCase() === trimmed.toLowerCase())
        ) {
          specialtiesToCreate.push({ nombre: trimmed, esPrincipal: idx === 0 });
        }
      });
    }

    if (specialtiesToCreate.length > 0) {
      const nivel = await tx.nivelEducativo.findFirst({
        where: { nombre: data.nivelEducativo },
      });

      if (nivel) {
        for (const item of specialtiesToCreate) {
          const especialidadEntity = await tx.especialidad.upsert({
            where: {
              nombre_nivelEducativoId: {
                nombre: item.nombre,
                nivelEducativoId: nivel.id,
              },
            },
            update: {},
            create: {
              nombre: item.nombre,
              nivelEducativoId: nivel.id,
              isActive: true,
            },
          });

          await tx.especialistaEspecialidad.create({
            data: {
              especialistaId: especialista.id,
              especialidadId: especialidadEntity.id,
              esPrincipal: item.esPrincipal,
            },
          });
        }
      }
    }

    const fullEsp = await tx.especialista.findUniqueOrThrow({
      where: { id: especialista.id },
      include: ESPECIALISTA_INCLUDE,
    });

    return mapEspecialista(fullEsp);
  });
}
