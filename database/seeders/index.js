import { prisma, disconnect } from './_lib/prisma.js';
import { seedUgeles } from './ugeles.js';
import { seedCatalogos } from './catalogos.js';
import { seedAuth } from './auth.js';
import { seedCargos } from './cargos.js';
import { seedInstituciones } from './instituciones.js';
import { seedPersonas } from './personas.js';
import { seedMonitoring } from './monitoring.js';
import { seedScheduling } from './scheduling.js';
import { seedAnalisisDemo } from './analisis-demo.js';
import { seedIeSecundariaDemo } from './ie-secundaria-demo.js';

/**
 * Orquestador del seeder. Ejecuta los modulos en orden de dependencias:
 * 1. Migraciones legacy (director_ie → director_institucion)
 * 2. Catalogos transversales (modalidades, niveles, especialidades, cursos)
 * 3. Auth (roles, permisos)
 * 4. Cargos
 * 5. Instituciones educativas
 * 6. Personas / Usuarios / Especialistas / Docentes
 * 7. Monitoring (planes + plantillas)
 * 8. Scheduling (cronograma)
 */

async function migrateLegacyRoles() {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE roles SET codigo = 'director_institucion' WHERE codigo = 'director_ie'`,
    );
    console.log('[legacy] Rol director_ie migrado a director_institucion.');
  } catch (err) {
    console.log('[legacy] director_ie ya migrado o no existe:', err.message);
  }
}

async function main() {
  console.log('=== Sistema de Monitoreo - Seeder ===\n');

  await migrateLegacyRoles();

  const { ugel } = await seedUgeles();
  const { nivelMap, cursoMap } = await seedCatalogos();
  const { roleMap } = await seedAuth();
  const cargoMap = await seedCargos();
  const { instMap } = await seedInstituciones();

  await seedPersonas({ roleMap, cargoMap, instMap, nivelMap, cursoMap });

  const { planUgelId } = await seedMonitoring({ instMap });
  await seedScheduling({ planUgelId });
  await seedAnalisisDemo();
  await seedIeSecundariaDemo();

  console.log('\n=== Seeding completado (incluye Planes, Plantillas y Fichas) ===');
  console.log('Credenciales: el DNI es la contrasena inicial (usuarios en isFirstLogin=true).');
  console.log('Usuarios creados:');
  console.log('  director_ugel        → DNI: 40000001');
  console.log('  jefe_gestion         → DNI: 40000002, 41000001');
  console.log('  jefe_area            → DNI: 40000003, 41000000, 41000002, 41000003, 41000004');
  console.log('  especialista         → DNI: 40000004, 40000005, 42000001, 42000002, 42000003, 42000004');
  console.log('  director_institucion → DNI: 40000006, 40000007, 43000001, 43000002, 43000003, 43000004, 43000005');
  console.log('  docente (y cargos)   → DNI: 40000008-40000013, 44000001-44000003');
}

main()
  .catch((e) => {
    console.error('Error en seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
