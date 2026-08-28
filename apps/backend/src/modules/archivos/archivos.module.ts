import { Module } from '@nestjs/common';
import { ArchivosController } from './controllers/archivos.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ArchivosController],
})
export class ArchivosModule {}
