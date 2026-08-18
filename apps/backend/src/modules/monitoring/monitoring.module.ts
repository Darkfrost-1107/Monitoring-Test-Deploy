import { Module } from '@nestjs/common';
import { MonitoringPlanController } from './controllers/monitoring-plan.controller.js';
import { PlantillaController } from './controllers/plantilla.controller.js';
import { MonitoringPlanService } from './services/monitoring-plan.service.js';
import { PlantillaService } from './services/plantilla.service.js';
import { PrerrequisitosDirectorService } from './services/prerrequisitos-director.service.js';
import { MonitoringPlanRepository } from './repositories/monitoring-plan.repository.js';
import { PrismaMonitoringPlanRepository } from './repositories/prisma-monitoring-plan.repository.js';
import { PlantillaRepository } from './repositories/plantilla.repository.js';
import { PrismaPlantillaRepository } from './repositories/prisma-plantilla.repository.js';
import { LemaAnualController } from './controllers/lema-anual.controller.js';
import { LemaAnualService } from './services/lema-anual.service.js';
import { LemaAnualRepository } from './repositories/lema-anual.repository.js';
import { PrismaLemaAnualRepository } from './repositories/prisma-lema-anual.repository.js';
import { PrismaModule } from '../../shared/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MonitoringPlanController, PlantillaController, LemaAnualController],
  providers: [
    MonitoringPlanService,
    {
      provide: MonitoringPlanRepository,
      useClass: PrismaMonitoringPlanRepository,
    },
    PlantillaService,
    PrerrequisitosDirectorService,
    {
      provide: PlantillaRepository,
      useClass: PrismaPlantillaRepository,
    },
    LemaAnualService,
    {
      provide: LemaAnualRepository,
      useClass: PrismaLemaAnualRepository,
    },
  ],
  exports: [
    MonitoringPlanService,
    PrerrequisitosDirectorService,
    MonitoringPlanRepository,
    PlantillaService,
    PlantillaRepository,
    LemaAnualService,
    LemaAnualRepository,
  ],
})
export class MonitoringModule {}
