import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVisitaDto {
  @IsUUID()
  monitorId!: string;

  @IsUUID()
  institucionId!: string;

  @IsUUID()
  evaluadoId!: string;

  /**
   * A quién se monitorea. EIB no es una clase de visita sino un instrumento: la
   * plantilla de cada ficha lo declara. Aceptar `DOCENTE_EIB` acá creaba
   * cronogramas que ninguna pantalla podía representar —`use-cronogramas-data`
   * los castea a DOCENTE | DIRECTIVO— y que el esquema tampoco contempla.
   */
  @IsString()
  @IsIn(['DOCENTE', 'DIRECTIVO'])
  tipoMonitoreo!: 'DOCENTE' | 'DIRECTIVO';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroVisita!: number;

  @IsDateString()
  fechaProgramada!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'horaInicio debe tener formato HH:mm o HH:mm:ss',
  })
  horaInicio!: string;

  @IsString()
  @IsIn(['EBR', 'EBA', 'EBE', 'CEPTRO'])
  modalidad!: 'EBR' | 'EBA' | 'EBE' | 'CEPTRO';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nivelEducativo!: string;

  @IsOptional()
  @IsString()
  detalles?: string;
}

export class UpdateVisitaDto {
  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  horaInicio?: string;

  @IsOptional()
  @IsString()
  detalles?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PROGRAMADO', 'EN_PROCESO', 'COMPLETADO', 'REPROGRAMADO', 'CANCELADO', 'ANULADO'])
  estado?: string;
}
