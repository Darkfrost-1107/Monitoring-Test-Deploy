import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ISignFichaRequest } from '@sistema-monitoreo/shared-contracts';

export class SignFichaDto implements ISignFichaRequest {
  @ApiProperty({
    description: 'Rol que está firmando la ficha en este momento',
    enum: ['EVALUADOR', 'EVALUADO'],
  })
  @IsIn(['EVALUADOR', 'EVALUADO'])
  rolFirmante!: 'EVALUADOR' | 'EVALUADO';

  @ApiProperty({
    description: 'Consentimiento legal o aceptación digital de la ficha',
    example: true,
  })
  @IsBoolean()
  consentimiento!: boolean;

  /**
   * Identifica la ficha cuando la ruta lleva el id del cronograma y la visita
   * tiene más de un instrumento. `(cronogramaId, plantillaId)` es único.
   */
  @ApiPropertyOptional({
    description: 'Plantilla del instrumento que se firma, si la visita tiene más de una ficha',
  })
  @IsOptional()
  @IsUUID()
  plantillaId?: string;
}
