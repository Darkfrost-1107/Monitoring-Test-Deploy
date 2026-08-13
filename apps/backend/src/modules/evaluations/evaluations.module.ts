import { Module } from '@nestjs/common';
import { FichaController } from './controllers/ficha.controller.js';
import { FirmasController } from './controllers/firmas.controller.js';
import { FichaService } from './services/ficha.service.js';
import { FichaRepository } from './repositories/ficha.repository.js';
import { PrismaFichaRepository } from './repositories/prisma-ficha.repository.js';
import { PrismaModule } from '../../shared/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { BaremoCalculatorService } from './motor/baremo-calculator.service.js';
import { ScopeFilter } from '../../shared/auth/scope-filter.js';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [FichaController, FirmasController],
  providers: [
    FichaService,
    ScopeFilter,
    BaremoCalculatorService,
    {
      provide: FichaRepository,
      useClass: PrismaFichaRepository,
    },
  ],
  exports: [FichaService, FichaRepository],
})
export class EvaluationsModule {}
