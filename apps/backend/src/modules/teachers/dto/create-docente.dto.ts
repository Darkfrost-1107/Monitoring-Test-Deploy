import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  IsUUID,
  IsInt,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ICreateDocenteRequest } from '@sistema-monitoreo/shared-contracts';
import { IsValidNivelForModalidad } from '../../../common/validators/modalidad-nivel.validator.js';
import { IsValidEspecialidadForNivel } from '../../../common/validators/especialidad.validator.js';

import { ApiProperty } from '@nestjs/swagger';

export class SeccionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El grado es requerido' })
  grado!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'La sección es requerida' })
  seccion!: string;
}

export class CreateDocenteDto implements ICreateDocenteRequest {
  @IsString()
  @IsNotEmpty({ message: 'El DNI es requerido' })
  @Length(8, 8, { message: 'El DNI debe tener exactamente 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'El DNI debe contener solo números' })
  dni!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(120, { message: 'El nombre no puede exceder los 120 caracteres' })
  nombres!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son requeridos' })
  @MaxLength(120, { message: 'Los apellidos no pueden exceder los 120 caracteres' })
  apellidos!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @MaxLength(255, { message: 'El correo electrónico no puede exceder los 255 caracteres' })
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(9, 9, { message: 'El celular debe tener exactamente 9 dígitos' })
  @Matches(/^\d{9}$/, { message: 'El celular debe contener solo números' })
  telefono?: string;

  @IsUUID('4', { message: 'El ID de la institución debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El ID de la institución es requerido' })
  institucionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'El grado académico no puede exceder los 50 caracteres' })
  gradoAcademico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  modalidad?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nivel educativo es requerido' })
  @MaxLength(50, { message: 'El nivel educativo no puede exceder los 50 caracteres' })
  @IsValidNivelForModalidad('modalidad')
  nivelEducativo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsValidEspecialidadForNivel('nivelEducativo')
  especialidad?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  especialidadesExtras?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'El curso asignado no puede exceder los 150 caracteres' })
  cursoAsignado?: string;

  @IsUUID('4', { message: 'El ID del cargo debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El ID del cargo es requerido' })
  cargoId!: string;

  @IsOptional()
  @IsString()
  condicionLaboral?: string;

  @IsOptional()
  @IsInt()
  cargaLaboral?: number;

  @IsOptional()
  @IsInt()
  escalaMagisterial?: number;

  @ApiProperty({ type: () => [SeccionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeccionDto)
  secciones?: SeccionDto[];
}
