import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { IEspecialistaResponse } from '@sistema-monitoreo/shared-contracts';
import { EstadoRegistro } from '../../../common/enums/estado.enum.js';
import { mapEspecialista, ESPECIALISTA_INCLUDE } from './especialista-mapper.helper.js';
import { findById } from './especialista-read.helper.js';

export async function deleteEspecialista(
  prisma: PrismaService,
  id: string,
): Promise<IEspecialistaResponse> {
  const existing = await findById(prisma, id);
  if (!existing) {
    throw new NotFoundException(`Especialista con ID ${id} no encontrado.`);
  }

  const esp = await prisma.especialista.findUnique({
    where: { id },
    include: {
      cargos: { where: { fechaFin: null } },
      persona: { include: { usuario: { include: { rol: true } } } },
    },
  });
  if (!esp) {
    throw new NotFoundException(`Especialista con ID ${id} no encontrado.`);
  }

  let count = 0n;
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM visitas_monitoreo WHERE especialista_id = ${id}::uuid
    `;
    count = result[0]?.count ?? 0n;
  } catch (err: unknown) {
    const error = err as { message?: string; meta?: { message?: string } };
    const isTableMissing =
      error.message?.includes('42P01') ||
      error.meta?.message?.includes('42P01') ||
      String(err).includes('42P01');
    if (isTableMissing) {
      count = 0n;
    } else {
      throw err;
    }
  }

  if (count > 0n) {
    throw new UnprocessableEntityException(
      `No se puede inactivar: el especialista tiene ${count} visita(s) de monitoreo registrada(s).`,
    );
  }

  const rolCodigo = esp.persona?.usuario?.rol?.codigo;

  return await prisma.$transaction(async (tx) => {
    const fin = new Date();
    await tx.especialistaCargo.updateMany({
      where: { especialistaId: id, fechaFin: null },
      data: { fechaFin: fin },
    });

    // `estado` faltaba: se cerraban los cargos y se reseteaba el cargo, pero el
    // registro seguía Activo. La pantalla mostraba «Inactivo» por su
    // actualización optimista y al recargar volvía a Activo, porque nunca se
    // había guardado. La ruta de alta sí escribe `estado`.
    await tx.especialista.update({
      where: { id },
      data: { cargo: 'Especialista', estado: EstadoRegistro.INACTIVO },
    });

    // Se corta el acceso: el login rechaza con «Cuenta inactiva» cuando
    // `isActive` es falso, pero la baja sólo cambiaba el rol y nunca lo apagaba,
    // de modo que un especialista dado de baja seguía entrando con normalidad.
    // La ruta de alta sí lo enciende.
    await tx.usuario.updateMany({
      where: { personaId: esp.personaId },
      data: { isActive: false },
    });

    if (rolCodigo === 'jefe_area') {
      const rolJefeArea = await tx.role.findUnique({
        where: { codigo: 'jefe_area' },
      });
      const rolEspecialista = await tx.role.findUnique({
        where: { codigo: 'especialista' },
      });
      if (rolJefeArea && rolEspecialista) {
        await tx.usuario.updateMany({
          where: { personaId: esp.personaId, rolId: rolJefeArea.id },
          data: { rolId: rolEspecialista.id },
        });
      }
    }

    const fullEsp = await tx.especialista.findUniqueOrThrow({
      where: { id },
      include: ESPECIALISTA_INCLUDE,
    });

    return mapEspecialista(fullEsp);
  });
}

export async function activate(prisma: PrismaService, id: string): Promise<IEspecialistaResponse> {
  const esp = await prisma.especialista.findUnique({
    where: { id },
  });
  if (!esp) {
    throw new NotFoundException(`Especialista con ID ${id} no encontrado.`);
  }

  return await prisma.$transaction(async (tx) => {
    await tx.usuario.updateMany({
      where: { personaId: esp.personaId },
      data: { isActive: true },
    });

    await tx.especialista.update({
      where: { id },
      data: { estado: EstadoRegistro.ACTIVO },
    });

    const fullEsp = await tx.especialista.findUniqueOrThrow({
      where: { id },
      include: ESPECIALISTA_INCLUDE,
    });

    return mapEspecialista(fullEsp);
  });
}

export async function deactivate(
  prisma: PrismaService,
  id: string,
): Promise<IEspecialistaResponse> {
  return deleteEspecialista(prisma, id);
}
