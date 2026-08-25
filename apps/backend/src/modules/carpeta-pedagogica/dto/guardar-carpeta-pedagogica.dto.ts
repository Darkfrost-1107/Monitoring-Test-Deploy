import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import type { IGuardarCarpetaPedagogicaRequest } from '@sistema-monitoreo/shared-contracts';

/**
 * Alta o reemplazo del enlace de la carpeta pedagógica propia.
 *
 * No lleva `docenteId`: el servicio resuelve al docente desde la sesión. Un
 * campo así en el cuerpo sería una invitación a escribir sobre la carpeta de
 * otra persona.
 *
 * La forma de la URL la valida el servicio contra la lista blanca de hosts
 * compartida con el frontend, no un decorador `@IsUrl()`: aceptar «cualquier
 * URL» acá y estrecharla después dejaría dos reglas distintas en el camino.
 */
export class GuardarCarpetaPedagogicaDto implements IGuardarCarpetaPedagogicaRequest {
  @IsInt()
  anioEscolar!: number;

  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
