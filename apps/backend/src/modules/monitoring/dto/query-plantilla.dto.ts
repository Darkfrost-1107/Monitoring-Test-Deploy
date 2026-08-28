import { ROLES_AUTOR_PLANTILLA, type RolAutorPlantilla } from '@sistema-monitoreo/shared-contracts';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

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

  /**
   * Incluir las plantillas versionadas que todavía conservan fichas.
   *
   * Versionar archiva la original y la marca `deleted`, de modo que deja de
   * listarse. Para el catálogo eso está bien: nadie va a monitorear con una
   * versión relevada. Para el ANÁLISIS no: sus fichas siguen existiendo y son
   * las que se están midiendo. Sin ellas, la pantalla ofrece rúbricas en cero
   * mientras calcula sobre una que ni siquiera aparece en la lista.
   *
   * Es opt-in para no cambiar lo que ve el catálogo, que es la mayoría de las
   * llamadas.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  incluirVersionadas?: boolean;
}
