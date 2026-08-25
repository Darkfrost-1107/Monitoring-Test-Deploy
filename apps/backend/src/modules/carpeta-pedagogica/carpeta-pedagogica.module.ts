import { Module } from '@nestjs/common';
import { CarpetaPedagogicaController } from './controllers/carpeta-pedagogica.controller.js';
import { CarpetaPedagogicaService } from './services/carpeta-pedagogica.service.js';
import { PrismaModule } from '../../shared/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CarpetaPedagogicaController],
  providers: [CarpetaPedagogicaService],
  exports: [CarpetaPedagogicaService],
})
export class CarpetaPedagogicaModule {}
