import { Module } from '@nestjs/common';
import { SolicitudesPlantillaController } from './controllers/solicitudes-plantilla.controller.js';
import { SolicitudesPlantillaService } from './services/solicitudes-plantilla.service.js';
import { ValePlantillaService } from './services/vale-plantilla.service.js';
import { PrismaModule } from '../../shared/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';

/**
 * Solicitudes de plantilla.
 *
 * `ValePlantillaService` se exporta porque el módulo de monitoreo lo consulta
 * antes de crear o duplicar una plantilla: la autorización es una condición de
 * la creación, no un trámite paralelo.
 */
@Module({
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [SolicitudesPlantillaController],
  providers: [SolicitudesPlantillaService, ValePlantillaService],
  exports: [ValePlantillaService],
})
export class SolicitudesPlantillaModule {}
