import { z } from 'zod';
import {
  cargaHoraria,
  celularObligatorio,
  correoObligatorio,
  dni,
  escalaMagisterial,
  nombreDePersona,
} from '@sistema-monitoreo/shared-validation';
import type { Docente } from './model';

export const seccionDocenteSchema = z.object({
  id: z.string().optional(),
  grado: z.string().min(1, 'El grado es requerido'),
  seccion: z
    .string()
    .length(1, 'La sección debe ser de un solo carácter')
    .regex(/^[A-Za-z0-9]$/, 'La sección debe ser un carácter alfanumérico'),
});

export const docenteSchema = z.object({
  id: z.string().optional(),
  nombres: nombreDePersona('El nombre es requerido'),
  apellidos: nombreDePersona('Los apellidos son requeridos'),
  dni: dni(),
  correo: correoObligatorio(),
  celular: celularObligatorio(),
  nivelEducativo: z.string().min(1, 'El nivel educativo es requerido'),
  condicion: z.enum(['Nombrado', 'Contratado', 'Designado', 'Encargado', 'Por Función']),
  especialidad: z.string().optional().or(z.literal('')),
  especialidadesExtras: z.array(z.string()).optional(),
  cargaHoraria: cargaHoraria(1, 40),
  secciones: z.array(seccionDocenteSchema).default([]),
  escala: escalaMagisterial(),
  institucionId: z.string().min(1, 'La institución de destino es requerida'),
  activo: z.boolean().default(true),
  cargo: z.enum(['Director', 'Coordinador Pedagógico', 'Jefe de Taller', 'Docente de Aula']),
}).refine((data) => {
  if (data.nivelEducativo === 'SECUNDARIA' && (!data.especialidad || !data.especialidad.trim())) {
    return false;
  }
  return true;
}, {
  message: 'La especialidad es requerida para el nivel Secundaria',
  path: ['especialidad'],
});

export type DocenteFormData = z.infer<typeof docenteSchema>;

export const docenteValidator = {
  isDirector: (docente: Docente): boolean => {
    return docente.cargo === 'Director';
  },
  isActive: (docente: Docente): boolean => {
    return docente.activo;
  },
};

export const directorSchema = z.object({
  nombres: nombreDePersona('El nombre es requerido'),
  apellidos: nombreDePersona('Los apellidos son requeridos'),
  dni: dni(),
  correo: correoObligatorio(),
  celular: celularObligatorio(),
  condicion: z.enum(['Designado', 'Encargado', 'Por Función']),
  escala: escalaMagisterial(),
  institucionId: z.string().min(1, 'La institución educativa es requerida'),
  nivelEducativo: z.string().min(1, 'Debe seleccionar un nivel educativo'),
  especialidad: z.string().min(3, 'La especialidad es requerida'),
  cargaHoraria: cargaHoraria(1, 40),
});

export type DirectorFormData = z.infer<typeof directorSchema>;
