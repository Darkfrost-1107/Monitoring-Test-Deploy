import { IsNotEmpty, IsString, Length, Matches, IsOptional } from 'class-validator';
import { ICreateInstitucionRequest } from '@sistema-monitoreo/shared-contracts';
import { IsValidNivelForModalidad } from '../../../common/validators/modalidad-nivel.validator.js';

export class CreateInstitucionDto implements ICreateInstitucionRequest {
  @IsString()
  @IsNotEmpty({ message: 'El código modular es requerido' })
  @Length(7, 7, { message: 'El código modular debe tener exactamente 7 dígitos' })
  @Matches(/^\d{7}$/, { message: 'El código modular debe contener solo números' })
  codigoModular!: string;

  @IsString()
  @IsNotEmpty({ message: 'El código de local es requerido' })
  @Length(6, 6, { message: 'El código de local debe tener exactamente 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código de local debe contener solo números' })
  codigoLocal!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre!: string;

  @IsString()
  @IsNotEmpty({ message: 'El nivel educativo es requerido' })
  @IsValidNivelForModalidad('modalidad')
  nivelEducativo!: string;

  @IsString()
  @IsOptional()
  departamento?: string;

  @IsString()
  @IsNotEmpty({ message: 'La provincia es requerida' })
  provincia!: string;

  @IsString()
  @IsNotEmpty({ message: 'El distrito es requerido' })
  distrito!: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es requerida' })
  direccion!: string;

  @IsString()
  @IsNotEmpty({ message: 'La zona es requerida' })
  zona!: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  modalidad?: string;

  @IsString()
  @IsOptional()
  directorDni?: string;
}
