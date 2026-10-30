import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { AuthUserWithRelations, UserRepository } from '../repositories/user.repository.js';
import { UpdatePerfilDto } from '../dto/update-perfil.dto.js';
import type { IPerfilResponse } from '@sistema-monitoreo/shared-contracts';
import { CargoNombre } from '../../../common/enums/cargo.enum.js';

@Injectable()
export class PerfilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  private extractLaborInfo(user: AuthUserWithRelations) {
    let cargo = user.rol?.nombre ?? '';
    let institucion = 'Sede UGEL Lampa';
    let condicion = 'Nombrado';
    let escala: string | number | null = null;
    let nivelEducativo: string | null = null;

    if (user.persona.docente) {
      const doc = user.persona.docente;
      const primaryCargo = doc.docenteCargos?.[0]?.cargo?.nombre;
      cargo = primaryCargo
        ? primaryCargo === CargoNombre.DIRECTOR
          ? `Director de ${doc.nivelEducativo}`
          : primaryCargo
        : (user.rol?.nombre ?? 'Docente');
      institucion = doc.institucion
        ? `${doc.institucion.codigoModular ? doc.institucion.codigoModular + ' - ' : ''}${doc.institucion.nombre}`
        : 'I.E. no asignada';
      condicion = doc.condicionLaboral ?? 'Nombrado';
      escala = doc.escalaMagisterial ?? null;
      nivelEducativo = doc.nivelEducativo ?? null;
    } else if (user.persona.especialista) {
      const esp = user.persona.especialista;
      const primaryCargo = esp.cargos?.[0]?.cargo;
      cargo = primaryCargo ?? user.rol?.nombre ?? 'Especialista';
      institucion = 'Sede UGEL Lampa';
      condicion = 'Nombrado';
      escala = esp.escalaMagisterial ?? null;
      nivelEducativo = esp.modalidad ?? 'EBR';
    }

    return { cargo, institucion, condicion, escala, nivelEducativo };
  }

  async getPerfil(userId: string): Promise<IPerfilResponse> {
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.persona) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }

    const labor = this.extractLaborInfo(user);

    return {
      id: user.id,
      dni: user.persona.dni,
      nombres: user.persona.nombres,
      apellidos: user.persona.apellidos,
      correo: user.persona.correo ?? null,
      telefono: user.persona.telefono ?? null,
      role: user.rol?.codigo ?? '',
      ...labor,
    };
  }

  async updatePerfil(userId: string, dto: UpdatePerfilDto): Promise<IPerfilResponse> {
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.persona) {
      throw new NotFoundException('Usuario o perfil no encontrado');
    }

    const personaId = user.personaId;

    // Sanitización de correo y teléfono: cadenas vacías pasan a ser null para no violar constraints uniques
    const cleanCorreo =
      dto.correo !== undefined
        ? dto.correo && dto.correo.trim().length > 0
          ? dto.correo.trim().toLowerCase()
          : null
        : undefined;

    const cleanTelefono =
      dto.telefono !== undefined
        ? dto.telefono && dto.telefono.trim().length > 0
          ? dto.telefono.trim().replace(/\D/g, '')
          : null
        : undefined;

    // Validación de unicidad de correo
    if (cleanCorreo) {
      const existingEmail = await this.prisma.persona.findFirst({
        where: {
          correo: cleanCorreo,
          id: { not: personaId },
        },
      });
      if (existingEmail) {
        throw new ConflictException(
          'El correo electrónico ya se encuentra registrado por otra persona',
        );
      }
    }

    // Validación de unicidad de teléfono
    if (cleanTelefono) {
      const existingPhone = await this.prisma.persona.findFirst({
        where: {
          telefono: cleanTelefono,
          id: { not: personaId },
        },
      });
      if (existingPhone) {
        throw new ConflictException(
          'El número de celular ya se encuentra registrado por otra persona',
        );
      }
    }

    // Actualizamos ÚNICAMENTE correo y teléfono.
    // DNI, nombres y apellidos son estrictamente inmutables.
    const updatedPersona = await this.prisma.persona.update({
      where: { id: personaId },
      data: {
        ...(cleanCorreo !== undefined ? { correo: cleanCorreo } : {}),
        ...(cleanTelefono !== undefined ? { telefono: cleanTelefono } : {}),
      },
    });

    const labor = this.extractLaborInfo(user);

    return {
      id: user.id,
      dni: updatedPersona.dni,
      nombres: updatedPersona.nombres,
      apellidos: updatedPersona.apellidos,
      correo: updatedPersona.correo ?? null,
      telefono: updatedPersona.telefono ?? null,
      role: user.rol?.codigo ?? '',
      ...labor,
    };
  }
}
