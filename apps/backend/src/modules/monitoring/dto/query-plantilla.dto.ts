import { ROLES_AUTOR_PLANTILLA, type RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryPlantillaDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  anioAcademico?: number;

  @IsOptional()
  @IsString()
  @IsIn(['DOCENTE', 'DIRECTIVO', 'DOCENTE_EIB'])
  tipoMonitoreo?: 'DOCENTE' | 'DIRECTIVO' | 'DOCENTE_EIB';

  @IsOptional()
  @IsString()
  @IsIn(['Borrador', 'Vigente', 'Historico'])
  estado?: 'Borrador' | 'Vigente' | 'Historico';

  @IsOptional()
  @IsString()
  @IsIn(ROLES_AUTOR_PLANTILLA)
  rolAutorAlCrear?: RolAutorPlantilla;

  @IsOptional()
  @IsString()
  institucionId?: string;
}
