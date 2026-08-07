import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { CreateDocenteDto } from '../dto/create-docente.dto.js';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import { mapDocente } from './docente-mapper.helper.js';
import {
  checkDirectorConflict,
  checkPersonaYaEsDirector,
  upsertCurso,
  upsertEspecialidad,
  syncEspecialista,
  resolveRoleCode,
} from './docente-shared.helper.js';

const DOCENTE_INCLUDE = {
  persona: true,
  docenteCargos: { include: { cargo: true }, orderBy: { fechaInicio: 'desc' } },
  docenteCursos: { include: { curso: true } },
  docenteEspecialidades: { include: { especialidad: true } },
  docenteSecciones: true,
} as const;

export async function createDocenteWithTransaction(
  prisma: PrismaService,
  configService: ConfigService,
  dto: CreateDocenteDto,
) {
  return prisma.$transaction(async (tx) => {
    const cargo = await tx.cargo.findUnique({ where: { id: dto.cargoId } });

    const existingPersona = await tx.persona.findUnique({
      where: { dni: dto.dni },
      include: { docente: true },
    });

    if (cargo?.nombre === 'Director') {
      await checkDirectorConflict(tx, dto.institucionId);
      // Un director dirige un solo colegio. Sin esta comprobación, una
      // institución todavía sin director aceptaba a alguien que ya dirige otra.
      if (existingPersona) {
        await checkPersonaYaEsDirector(tx, existingPersona.id);
      }
    }

    let personaId: string;
    let docente: { id: string; modalidad: string | null } | null = null;

    if (existingPersona) {
      personaId = existingPersona.id;
      await tx.persona.update({
        where: { id: existingPersona.id },
        data: {
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo !== undefined ? dto.correo || null : existingPersona.correo,
          telefono: dto.telefono !== undefined ? dto.telefono || null : existingPersona.telefono,
        },
      });

      if (existingPersona.docente) {
        if (cargo?.nombre !== 'Director') {
          throw new ConflictException('El docente con este DNI ya se encuentra registrado.');
        }
        docente = await tx.docente.update({
          where: { id: existingPersona.docente.id },
          data: {
            institucionId: dto.institucionId,
            nivelEducativo: dto.nivelEducativo,
            condicionLaboral: dto.condicionLaboral ?? null,
            escalaMagisterial: dto.escalaMagisterial ?? null,
            estado: EstadoRegistro.ACTIVO,
          },
        });
        await tx.docenteCargo.updateMany({
          where: { docenteId: docente.id, fechaFin: null },
          data: { fechaFin: new Date(), esPrincipal: false },
        });
      } else {
        docente = await tx.docente.create({
          data: {
            personaId,
            institucionId: dto.institucionId,
            gradoAcademico: dto.gradoAcademico ?? null,
            nivelEducativo: dto.nivelEducativo,
            condicionLaboral: dto.condicionLaboral ?? null,
            escalaMagisterial: dto.escalaMagisterial ?? null,
            estado: EstadoRegistro.ACTIVO,
          },
        });
      }
    } else {
      if (dto.correo) {
        const correoExists = await tx.persona.findUnique({ where: { correo: dto.correo } });
        if (correoExists) {
          throw new ConflictException(
            'El correo electrónico ya está registrado para otra persona.',
          );
        }
      }
      const newPersona = await tx.persona.create({
        data: {
          dni: dto.dni,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          correo: dto.correo || null,
          telefono: dto.telefono || null,
        },
      });
      personaId = newPersona.id;
      docente = await tx.docente.create({
        data: {
          personaId,
          institucionId: dto.institucionId,
          gradoAcademico: dto.gradoAcademico ?? null,
          nivelEducativo: dto.nivelEducativo,
          condicionLaboral: dto.condicionLaboral ?? null,
          escalaMagisterial: dto.escalaMagisterial ?? null,
          estado: EstadoRegistro.ACTIVO,
        },
      });
    }

    if (dto.cursoAsignado) {
      await upsertCurso(tx, prisma, dto.cursoAsignado, dto.nivelEducativo, docente.id);
    }

    if (dto.especialidad) {
      await upsertEspecialidad(tx, prisma, dto.especialidad, dto.nivelEducativo, docente.id);
    }

    await tx.docenteCargo.create({
      data: {
        docenteId: docente.id,
        cargoId: dto.cargoId,
        fechaInicio: new Date(),
        esPrincipal: true,
      },
    });

    if (dto.secciones?.length) {
      await tx.docenteSeccion.createMany({
        data: dto.secciones.map((s) => ({
          docenteId: docente.id,
          grado: s.grado,
          seccion: s.seccion,
        })),
      });
    }

    const roleCode = resolveRoleCode(cargo?.nombre ?? '');
    const role = await tx.role.findUnique({ where: { codigo: roleCode } });
    if (!role) throw new ConflictException(`El rol ${roleCode} no está configurado en el sistema.`);

    const existingUser = await tx.usuario.findUnique({ where: { personaId } });
    if (!existingUser) {
      const saltRounds = configService.get<number>('BCRYPT_SALT_ROUNDS') ?? 12;
      const passwordHash = await bcrypt.hash(dto.dni, saltRounds);
      await tx.usuario.create({
        data: { personaId, rolId: role.id, passwordHash, isActive: true, isFirstLogin: true },
      });
    } else {
      await tx.usuario.update({
        where: { id: existingUser.id },
        data: { rolId: role.id },
      });
    }

    if (cargo) {
      await syncEspecialista(
        tx,
        personaId,
        cargo.nombre,
        dto.nivelEducativo,
        dto.condicionLaboral ?? null,
        dto.cargaLaboral ?? null,
        docente?.modalidad ?? null,
        dto.escalaMagisterial ?? null,
      );
    }

    const fullDocente = await tx.docente.findUniqueOrThrow({
      where: { id: docente.id },
      include: DOCENTE_INCLUDE,
    });
    return mapDocente(fullDocente);
  });
}
