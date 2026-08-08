import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';

/**
 * Contexto de seguridad a nivel de fila.
 *
 * Las políticas viven en las migraciones y protegen `cronogramas`,
 * `fichas_monitoreo` y `solicitudes_reprogramacion`. Consultan tres GUC de
 * sesión que este servicio establece justo después de verificar el token.
 *
 * ── Por qué existe la comprobación de arranque ──
 * Postgres ignora toda política para un rol con `BYPASSRLS`, lo que incluye a
 * cualquier superusuario. Con `DATABASE_URL` apuntando a `admin`, las tres
 * tablas quedan sin protección y **nada lo dice**: los GUC se establecen sin
 * error y ninguna política los llega a consultar. El aislamiento parece estar
 * puesto y no lo está.
 *
 * `prisma/setup.sql` crea `monitoreo_app` sin ese privilegio, y
 * `test/rls.e2e-spec.ts` comprueba el aislamiento contra Postgres real. Lo que
 * faltaba era que el arranque avisara cuando la conexión no es la correcta.
 */
@Injectable()
export class RlsGucService implements OnModuleInit {
  private readonly logger = new Logger(RlsGucService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.comprobarQueRlsEsteEnEfecto();
  }

  /**
   * Establece los GUC de la sesión para RLS, inmediatamente después de
   * verificar el token. Quedan en la conexión del pool hasta que se devuelva.
   *
   * Si falla, la petición sigue y las políticas ven los GUC vacíos, lo que
   * devuelve **cero filas**: la degradación es hacia no ver nada. Por eso no se
   * interrumpe la petición, pero sí se registra.
   */
  async setSessionGucs(userId: string, role: string, institucionId: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `SELECT
          set_config('app.user_id', $1, true),
          set_config('app.user_rol', $2, true),
          set_config('app.user_institucion_id', $3, true)`,
        userId,
        role,
        institucionId ?? '',
      );
    } catch (err) {
      this.logger.warn(
        `No se pudieron establecer los GUC de RLS; la consulta devolverá cero filas: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Comprueba que el rol de conexión no evite las políticas.
   *
   * Es un diagnóstico: que no se pueda comprobar no debe impedir el arranque.
   */
  async comprobarQueRlsEsteEnEfecto(): Promise<void> {
    try {
      const [conexion] = await this.prisma.$queryRawUnsafe<
        { usuario: string; evita_rls: boolean }[]
      >(
        `SELECT current_user AS usuario,
                (rolsuper OR rolbypassrls) AS evita_rls
           FROM pg_roles
          WHERE rolname = current_user`,
      );

      if (!conexion?.evita_rls) return;

      this.logger.error(
        `La seguridad a nivel de fila NO está en efecto: la aplicación se conecta como '${conexion.usuario}', ` +
          'un rol que evita toda política de RLS. Las tablas cronogramas, fichas_monitoreo y ' +
          'solicitudes_reprogramacion quedan sin aislamiento por usuario. ' +
          'Ejecute prisma/setup.sql y apunte DATABASE_URL al rol monitoreo_app.',
      );
    } catch (err) {
      this.logger.warn(`No se pudo comprobar si RLS está en efecto: ${(err as Error).message}`);
    }
  }
}
