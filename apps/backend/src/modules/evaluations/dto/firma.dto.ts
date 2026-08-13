import { IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
}
