import { Module } from '@nestjs/common';
import { TeachersService } from './services/teachers.service.js';
import { TeachersController } from './controllers/teachers.controller.js';
import { DocentesCargosController } from './controllers/docentes-cargos.controller.js';
import { DocentesCargosService } from './services/docentes-cargos.service.js';
import { PrismaModule } from '../../shared/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TeachersRepository } from './repositories/teachers.repository.js';
import { PrismaTeachersRepository } from './repositories/prisma-teachers.repository.js';
import { DocentesCargosRepository } from './repositories/docentes-cargos.repository.js';
import { PrismaDocentesCargosRepository } from './repositories/prisma-docentes-cargos.repository.js';
import { CargoCompatibilityService } from './services/cargo-compatibility.service.js';
import { RestablecerContrasenaService } from './services/restablecer-contrasena.service.js';
import { CatalogsModule } from '../catalogs/catalogs.module.js';

@Module({
  imports: [PrismaModule, AuthModule, CatalogsModule],
  controllers: [TeachersController, DocentesCargosController],
  providers: [
    TeachersService,
    RestablecerContrasenaService,
    DocentesCargosService,
    CargoCompatibilityService,
    {
      provide: TeachersRepository,
      useClass: PrismaTeachersRepository,
    },
    {
      provide: DocentesCargosRepository,
      useClass: PrismaDocentesCargosRepository,
    },
  ],
  exports: [TeachersService, TeachersRepository, DocentesCargosService, DocentesCargosRepository],
})
export class TeachersModule {}
