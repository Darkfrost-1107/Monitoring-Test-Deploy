import { IsOptional, IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { IUpdateInstitucionRequest } from '@sistema-monitoreo/shared-contracts';
import { IsValidNivelForModalidad } from '../../../common/validators/modalidad-nivel.validator.js';

export class UpdateInstitucionDto implements IUpdateInstitucionRequest {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El nivel educativo no puede estar vacío' })
  @IsValidNivelForModalidad('modalidad')
  nivelEducativo?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El departamento no puede estar vacío' })
  departamento?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'La provincia no puede estar vacía' })
  provincia?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El distrito no puede estar vacío' })
  distrito?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'La dirección no puede estar vacía' })
  direccion?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'La zona no puede estar vacía' })
  zona?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El estado no puede estar vacío' })
  estado?: string;

  @IsString()
  @IsOptional()
  directorDni?: string;

  @IsString()
  @IsOptional()
  @Length(6, 6, { message: 'El código de local debe tener exactamente 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código de local debe contener solo números' })
  codigoLocal?: string;

  @IsString()
  @IsOptional()
  modalidad?: string;
}
