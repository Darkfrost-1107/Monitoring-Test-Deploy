import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limita por usuario y no por dirección IP.
 *
 * El límite del ingreso —cinco intentos por minuto— se contaba por IP, y en una
 * oficina de la UGEL todo el personal sale por la misma dirección pública: cinco
 * personas entrando a las ocho de la mañana agotaban el cupo y la sexta recibía
 * un 429 sin haber hecho nada. El límite castigaba a la oficina entera por el
 * ritmo de sus primeros cinco.
 *
 * Contando por DNI, cada persona tiene su propio cupo y el de al lado no la
 * afecta.
 *
 * ── Qué protege y qué no ──
 * Acota cuántas veces por minuto se puede intentar contra **una cuenta**. Quien
 * rote DNIs desde una misma IP no queda acotado por acá: para eso está el
 * bloqueo de cuenta, que suspende treinta minutos a los tres fallos, y el límite
 * general de la aplicación.
 *
 * En las rutas sin DNI en el cuerpo se sigue contando por IP, que es lo único
 * que las identifica.
 */
@Injectable()
export class ThrottlePorUsuarioGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const cuerpo = req.body as { dni?: unknown } | undefined;
    const dni = typeof cuerpo?.dni === 'string' ? cuerpo.dni.trim() : '';

    // `req.ip` llega sin tipar: si no es una cadena no se lo fuerza, porque
    // stringificar un objeto daría la misma clave para peticiones distintas y
    // todas compartirían cupo.
    const ip = typeof req.ip === 'string' ? req.ip : 'desconocida';

    // Se prefijan las claves para que un DNI no pueda colisionar nunca con una
    // IP en el almacén compartido del throttler.
    return Promise.resolve(dni ? `dni:${dni}` : `ip:${ip}`);
  }
}
