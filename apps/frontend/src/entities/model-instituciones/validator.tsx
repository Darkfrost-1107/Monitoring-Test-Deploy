import { z } from 'zod';
import type { Institucion } from './model';
import { MODALIDAD_NIVEL_MAP } from '@sistema-monitoreo/shared-contracts';

// Esquema de validación para formularios y API
export const institucionSchema = z
  .object({
    id: z.string().optional(), // Opcional al crear una nueva
    codigoModular: z
      .string()
      .length(7, 'El código modular debe tener exactamente 7 dígitos')
      .regex(/^\d+$/, 'El código modular solo debe contener números'),
    codigoLocal: z
      .string()
      .length(6, 'El código de local debe tener exactamente 6 dígitos')
      .regex(/^\d+$/, 'El código de local solo debe contener números'),
    nombre: z.string().min(4, 'El nombre de la institución es muy corto'),
    direccion: z.string().min(4, 'La dirección es requerida'),
    nivel: z.string().min(1, 'El nivel educativo es requerido'),
    distrito: z.string().min(2, 'Debe seleccionar un distrito'),
    director: z.string().nullable(), // Permitimos que no tenga director
    estado: z.enum(['Activa', 'Inactiva']),
    provincia: z.string().optional(),
    zona: z.enum(['Urbana', 'Rural']).optional(),
    directorTelefono: z
      .string()
      .regex(/^9\d{8}$/, 'Debe ser un número de celular válido (9 dígitos)')
      .optional()
      .or(z.literal('')),
    directorCorreo: z.string().email('Formato de correo inválido').optional().or(z.literal('')),
    modalidad: z.enum(['EBR', 'EBA', 'EBE', 'CEPTRO'], {
      message: 'Debe seleccionar una modalidad válida',
    }),
  })
  .refine(
    (data) => {
      const validNiveles = MODALIDAD_NIVEL_MAP[data.modalidad] || [];
      return validNiveles.includes(data.nivel);
    },
    {
      message: 'El nivel educativo no es válido para la modalidad seleccionada',
      path: ['nivel'],
    },
  );

// Tipos inferidos de Zod (útil para el Feature que maneje el formulario)
export type InstitucionFormData = z.infer<typeof institucionSchema>;

// Funciones puras de negocio
export const institucionValidator = {
  /**
   * Verifica si la institución necesita asignación urgente de un director
   */
  needsDirector: (inst: Institucion): boolean => {
    return inst.director === null || inst.director.trim() === '';
  },

  /**
   * Verifica si la institución está en estado de riesgo
   */
  isCritical: (inst: Institucion): boolean => {
    return inst.estado === 'Inactiva';
  },
};
