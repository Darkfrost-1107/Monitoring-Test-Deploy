import { RoleCode } from '../../common/enums/role.enum.js';

/**
 * Devuelve a su lugar a quien deja un cargo único.
 *
 * ── Por qué no todos vuelven a Especialista ──
 * Director de UGEL y Jefe de Gestión se ganan por examen: puede quedarlos un
 * especialista en ejercicio o alguien que nunca trabajó como tal. Antes se
 * devolvía a todo el mundo al rol de especialista, lo que convertía al segundo
 * en un especialista que nunca fue y lo dejaba en el padrón como personal
 * activo, disponible para que le asignaran monitoreos.
 *
 * Ahora se mira `rolPrevio`, que se graba al designar. Si el usuario venía de
 * algún rol, se le devuelve ése. Si no —entró desde afuera— se lo da de baja:
 * quien se retira de la UGEL deja de tener acceso, y no hay puesto que
 * inventarle.
 *
 * En ambos casos el cargo se retira: quien deja de dirigir la UGEL no puede
 * seguir figurando como su director, ni siquiera con la cuenta apagada. Sin rol
 * previo cae al de especialista, que es el rol base del sistema, y queda
 * inactivo.
 *
 * En ambos casos se limpia `rolPrevio`: ya se usó, y dejarlo haría que el
 * próximo relevo restaurara un rol de dos cargos atrás.
 */

/** Lo mínimo que este helper necesita del cliente de Prisma. */
interface ClienteConUsuariosYRoles {
  usuario: {
    update: (args: {
      where: { id: string };
      data: { rolId?: string; rolPrevio: null; isActive?: boolean };
    }) => Promise<unknown>;
  };
  role: {
    findUnique: (args: { where: { codigo: string } }) => Promise<{ id: string } | null>;
  };
}

interface UsuarioRelevable {
  id: string;
  rolPrevio: string | null;
}

export async function relevarDelCargo(
  tx: ClienteConUsuariosYRoles,
  usuario: UsuarioRelevable,
): Promise<void> {
  const rolPrevio = usuario.rolPrevio
    ? await tx.role.findUnique({ where: { codigo: usuario.rolPrevio } })
    : null;

  if (rolPrevio) {
    await tx.usuario.update({
      where: { id: usuario.id },
      data: { rolId: rolPrevio.id, rolPrevio: null },
    });
    return;
  }

  // Sin rol previo al cual volver: se le retira el cargo igual y se lo da de
  // baja. Apagar la cuenta sin sacarle el rol lo dejaba figurando como Director
  // de UGEL, que es el puesto que acaba de perder.
  const rolBase = await tx.role.findUnique({ where: { codigo: RoleCode.ESPECIALISTA } });

  // Se conserva la fila para no perder su historial de auditoría ni las fichas
  // que haya firmado.
  await tx.usuario.update({
    where: { id: usuario.id },
    data: {
      ...(rolBase ? { rolId: rolBase.id } : {}),
      isActive: false,
      rolPrevio: null,
    },
  });
}

/** Los cargos que admiten un solo ocupante a la vez. */
export const esCargoUnico = (roleCode: string): boolean =>
  roleCode === RoleCode.DIRECTOR_UGEL || roleCode === RoleCode.JEFE_GESTION;
