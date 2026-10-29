import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type {
  DestinatarioAlerta,
  ICrearAlertaDistritoRequest,
  ICrearAlertaInstitucionRequest,
} from '@sistema-monitoreo/shared-contracts';
import { DESTINATARIO_ALERTA } from '../constants/destinatario-alerta.js';

export class CrearAlertaInstitucionDto implements ICrearAlertaInstitucionRequest {
  @IsUUID()
  institucionId!: string;

  @IsOptional()
  @IsUUID()
  docenteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  docenteNombre?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debe indicar al menos un destinatario' })
  @IsIn(Object.values(DESTINATARIO_ALERTA), { each: true })
  destinatarios!: DestinatarioAlerta[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mensaje?: string;
}

export class CrearAlertaDistritoDto implements ICrearAlertaDistritoRequest {
  @IsString()
  @MaxLength(150)
  distrito!: string;

  @IsOptional()
  @IsNumber()
  promedio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mensaje?: string;
}
