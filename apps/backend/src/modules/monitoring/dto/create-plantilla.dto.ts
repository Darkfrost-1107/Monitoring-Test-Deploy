import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class NivelCalificacionInput {
  @IsString()
  @IsIn(['I', 'II', 'III', 'IV'])
  nivelRomano!: 'I' | 'II' | 'III' | 'IV';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  denominacion!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rangoMin!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(7)
  color!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden!: number;
}

export class RubricaNivelInput {
  @IsString()
  @IsIn(['I', 'II', 'III', 'IV'])
  nivelRomano!: 'I' | 'II' | 'III' | 'IV';

  @IsString()
  @IsNotEmpty()
  descripcion!: string;
}

export class AspectoInput {
  @IsUUID()
  id!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden!: number;
}

export class DesempenoInput {
  @IsUUID()
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcionCorta?: string;

  @IsOptional()
  @IsString()
  preguntaExtra?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AspectoInput)
  aspectos!: AspectoInput[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RubricaNivelInput)
  rubrica!: RubricaNivelInput[];
}

export class EjeItemInput {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero!: number;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orden?: number;
}

export class CreatePlantillaDto {
  @IsString()
  @IsIn(['DOCENTE', 'DIRECTIVO'])
  tipoMonitoreo!: 'DOCENTE' | 'DIRECTIVO';

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anioAcademico!: number;

  @IsString()
  @IsIn(['Vigente', 'Porcentual'])
  baremo!: 'Vigente' | 'Porcentual';

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsArray()
  @ArrayMinSize(4)
  @ValidateNested({ each: true })
  @Type(() => NivelCalificacionInput)
  niveles!: NivelCalificacionInput[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DesempenoInput)
  desempenos!: DesempenoInput[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EjeItemInput)
  ejeItems?: EjeItemInput[];
}
