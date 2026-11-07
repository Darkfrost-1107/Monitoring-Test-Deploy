import { IsInt, IsOptional, IsString, IsUUID, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFichaDto {
  @IsUUID()
  cronogramaId!: string;

  /** Plantilla con la que el actor está llenando la ficha (su propia plantilla). */
  @IsOptional()
  @IsUUID()
  plantillaId?: string;

  @IsOptional()
  @IsString()
  areaCurricular?: string;

  @IsOptional()
  @IsString()
  grado?: string;

  @IsOptional()
  @IsString()
  seccion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  cantidadEstudiantes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  cantidadEstudiantesNee?: number;

  @IsOptional()
  @IsUUID()
  cursoId?: string;
}

export class SaveRespuestaDesempenoDto {
  @IsUUID()
  desempenoId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  nivel!: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsBoolean()
  preguntaExtraRespuesta?: boolean;
}

export class SaveRespuestaEjeItemDto {
  @IsUUID()
  ejeItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  nivel!: number;

  @IsOptional()
  @IsString()
  evidenciaUrl?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class SaveRespuestasAspectoBatchDto {
  @IsUUID()
  fichaId!: string;

  @IsOptional()
  aspectoId?: string;

  @IsOptional()
  marcado?: boolean;
}

export class FinalizarFichaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  sugerencias?: string;

  @IsOptional()
  @IsString()
  compromisos?: string;

  @IsOptional()
  @IsString()
  evidenciaGeneral?: string;
}

export class GuardarBorradorFichaDto extends FinalizarFichaDto {}
