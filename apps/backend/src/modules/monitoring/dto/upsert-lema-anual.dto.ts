import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LEMA_ANUAL_MAX_LENGTH } from '@sistema-monitoreo/shared-contracts';

export class UpsertLemaAnualDto {
  /** Texto exacto del decreto supremo publicado en El Peruano. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(LEMA_ANUAL_MAX_LENGTH)
  lema!: string;
}
