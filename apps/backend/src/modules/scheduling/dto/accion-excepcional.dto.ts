import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import type { TipoAccionExcepcional } from '@sistema-monitoreo/shared-contracts';

export class AccionExcepcionalDto {
  @IsString()
  @IsIn(['ANULACION_TOTAL', 'REAPERTURA_FICHA'], {
    message: 'tipoAccion debe ser ANULACION_TOTAL o REAPERTURA_FICHA',
  })
  tipoAccion!: TipoAccionExcepcional;

  @IsString()
  @IsNotEmpty({ message: 'El número de expediente o trámite es obligatorio' })
  @MinLength(3, { message: 'El número de expediente debe tener al menos 3 caracteres' })
  numeroExpediente!: string;

  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres explicativos' })
  motivo!: string;

  @IsString()
  @IsNotEmpty({ message: 'El archivo de sustento en base64 es obligatorio' })
  archivoSustentoBase64!: string;

  @IsOptional()
  @IsString()
  archivoSustentoNombre?: string;
}
