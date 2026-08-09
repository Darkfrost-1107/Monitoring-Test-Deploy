import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  IsIn,
} from 'class-validator';
import type { ICreateEspecialistaRequest } from '@sistema-monitoreo/shared-contracts';
import { CargoEspecialista, CondicionLaboralDeAlta } from '@sistema-monitoreo/shared-contracts';
import { IsValidNivelForModalidad } from '../../../common/validators/modalidad-nivel.validator.js';

export class CreateEspecialistaDto implements ICreateEspecialistaRequest {
  @IsString()
  @IsNotEmpty()
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 caracteres' })
  dni!: string;

  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  apellidos!: string;

  @IsEmail()
  @IsOptional()
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(9, 9, { message: 'El celular debe tener exactamente 9 dígitos' })
  @Matches(/^\d{9}$/, { message: 'El celular debe contener solo números' })
  telefono?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(CargoEspecialista), {
    message: 'El cargo debe ser Especialista, Jefe de Área o Jefe de Gestión',
  })
  cargo!: string;

  @IsString()
  @IsNotEmpty()
  modalidad!: string;

  @IsString()
  @IsNotEmpty()
  @IsValidNivelForModalidad('modalidad')
  nivelEducativo!: string;

  @IsOptional()
  especialidades?: string[];

  @IsString()
  @IsOptional()
  especialidad?: string;

  @IsOptional()
  especialidadesExtras?: string[];

  @IsString()
  @IsNotEmpty()
  rolCode!: string;

  @IsString()
  @IsOptional()
  @IsIn(CondicionLaboralDeAlta, {
    message: 'La condición laboral debe ser Encargado, Destacado o Designado',
  })
  condicionLaboral?: string;

  @IsInt()
  @IsOptional()
  cargaLaboral?: number;

  @IsInt()
  @IsOptional()
  escalaMagisterial?: number | null;
}
