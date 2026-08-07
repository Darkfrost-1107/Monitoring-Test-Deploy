import { z } from 'zod';
import { CargoEspecialista, ModalidadEducativa } from '@sistema-monitoreo/shared-contracts';
import {
  celularOpcional,
  correoOpcional,
  dni,
  nombreDePersona,
} from '@sistema-monitoreo/shared-validation';

export const especialistaSchema = z.object({
  nombres: nombreDePersona('Los nombres deben tener al menos 2 caracteres'),
  apellidos: nombreDePersona('Los apellidos deben tener al menos 2 caracteres'),
  dni: dni(),
  correo: correoOpcional(),
  celular: celularOpcional(),
  cargo: z.nativeEnum(CargoEspecialista, {
    message: 'Debe seleccionar un cargo válido',
  }),
  modalidad: z.nativeEnum(ModalidadEducativa, {
    message: 'Debe seleccionar una modalidad válida',
  }),
  nivelEducativo: z.string().min(1, 'Debe seleccionar un nivel educativo'),
  especialidades: z.array(z.string()).optional(),
  especialidad: z.string().optional(),
  especialidadesExtras: z.array(z.string()).optional(),
  activo: z.boolean().optional(),
  condicionLaboral: z.enum(['Encargado', 'Destacado', 'Designado', 'Nombrado', 'Contratado'], {
    message: 'Debe seleccionar la condición laboral',
  }),
  cargaLaboral: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z
      .number({ message: 'La carga laboral es requerida' })
      .min(10, 'Mínimo 10 horas')
      .max(60, 'Máximo 60 horas'),
  ),
  escalaMagisterial: z
    .preprocess(
      (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
      z.number().min(1, 'Escala mínima es 1').max(8, 'Escala máxima es 8').optional(),
    )
    .optional(),
});

export type EspecialistaFormData = z.infer<typeof especialistaSchema>;
