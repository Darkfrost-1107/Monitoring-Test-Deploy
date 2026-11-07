import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type {
  IEspecialistaResponse,
  IQueryEspecialistaRequest,
} from '@sistema-monitoreo/shared-contracts';
import { mapEspecialista, ESPECIALISTA_INCLUDE } from './especialista-mapper.helper.js';
import type { CargoRecord } from './especialista.repository.js';

export async function findAll(
  prisma: PrismaService,
  filters?: IQueryEspecialistaRequest,
): Promise<IEspecialistaResponse[]> {
  const list = await prisma.especialista.findMany({
    where: {
      ...(filters?.estado && { estado: filters.estado }),
      ...(filters?.nivelEducativo && { nivelEducativo: filters.nivelEducativo }),
    },
    include: ESPECIALISTA_INCLUDE,
  });

  const mapped = list.map((esp) => mapEspecialista(esp));
  if (filters?.cargo) {
    return mapped.filter((esp) => esp.cargo === filters.cargo);
  }
  return mapped;
}

export async function findById(
  prisma: PrismaService,
  id: string,
): Promise<IEspecialistaResponse | null> {
  const esp = await prisma.especialista.findUnique({
    where: { id },
    include: ESPECIALISTA_INCLUDE,
  });
  if (!esp) return null;
  return mapEspecialista(esp);
}

export async function findUserIdByEspecialistaId(
  prisma: PrismaService,
  especialistaId: string,
): Promise<string | null> {
  const esp = await prisma.especialista.findUnique({
    where: { id: especialistaId },
    select: { persona: { select: { usuario: { select: { id: true } } } } },
  });
  return esp?.persona?.usuario?.id ?? null;
}

export async function findUsuarioInfoByEspecialistaId(
  prisma: PrismaService,
  especialistaId: string,
): Promise<{ id: string; isFirstLogin: boolean; passwordHash: string } | null> {
  const esp = await prisma.especialista.findUnique({
    where: { id: especialistaId },
    select: {
      persona: {
        select: {
          usuario: { select: { id: true, isFirstLogin: true, passwordHash: true } },
        },
      },
    },
  });
  return esp?.persona?.usuario ?? null;
}

export async function findCargosByEspecialistaId(
  prisma: PrismaService,
  especialistaId: string,
): Promise<CargoRecord[]> {
  return prisma.especialistaCargo.findMany({
    where: { especialistaId },
    orderBy: [{ fechaFin: 'asc' }, { fechaInicio: 'desc' }],
  });
}

export async function findCargoById(
  prisma: PrismaService,
  id: string,
): Promise<CargoRecord | null> {
  return prisma.especialistaCargo.findUnique({
    where: { id },
  });
}

export async function countActiveCargos(
  prisma: PrismaService,
  especialistaId: string,
): Promise<number> {
  return prisma.especialistaCargo.count({
    where: { especialistaId, fechaFin: null },
  });
}
