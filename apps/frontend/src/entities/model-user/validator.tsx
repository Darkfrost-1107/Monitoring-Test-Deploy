import { z } from 'zod';
import { ALL_ROLE_CODES } from '@sistema-monitoreo/shared-contracts';
import { READ_ONLY_ROLES } from '@sistema-monitoreo/shared-contracts';
import { ADMIN_ROLES } from './constants';
import type { User } from './model';

// 1. Esquema de validación base de la entidad Usuario
export const userSchema = z.object({
  dni: z
    .string()
    .length(8, 'El DNI debe tener exactamente 8 dígitos')
    .regex(/^\d+$/, 'El DNI solo debe contener números'),
  nombres: z.string().min(2, 'Los nombres son muy cortos'),
  apellidos: z.string().min(2, 'Los apellidos son muy cortos'),
  // Los valores admitidos se derivan del contrato compartido: enumerarlos aquí
  // creaba una cuarta lista de roles que podía divergir en silencio. Antes
  // incluía 'admin', que el backend nunca emite.
  role: z.enum(ALL_ROLE_CODES as [string, ...string[]]),
  institucion: z.string().optional(),
  distrito: z.string().optional(),
  firstLogin: z.boolean(),
});

// 2. Funciones puras de validación de negocio (Helpers)
export const userValidator = {
  /**
   * Verifica si el usuario tiene privilegios administrativos completos
   */
  isAdmin: (user: User | null): boolean => {
    if (!user) return false;
    return ADMIN_ROLES.includes(user.role);
  },

  /**
   * Verifica si el usuario solo puede visualizar datos sin mutarlos
   */
  isReadOnly: (user: User | null): boolean => {
    if (!user) return true;
    return READ_ONLY_ROLES.includes(user.role);
  },

  /**
   * Verifica si un usuario pertenece al dominio de una institución educativa
   */
  isInstitutionStaff: (user: User | null): boolean => {
    if (!user) return false;
    return !!user.institucion;
  },
};
