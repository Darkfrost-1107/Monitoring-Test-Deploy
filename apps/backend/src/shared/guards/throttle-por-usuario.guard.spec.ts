import { ThrottlePorUsuarioGuard } from './throttle-por-usuario.guard.js';

/**
 * Pruebas de con qué clave se cuenta el límite de peticiones.
 *
 * Se contaba por IP, y en una oficina de la UGEL todo el personal sale por la
 * misma dirección pública: cinco personas entrando a las ocho de la mañana
 * agotaban el cupo del ingreso y la sexta recibía un 429 sin haber hecho nada.
 *
 * La clave es lo que decide a quién se le acota: equivocarla no rompe nada de
 * forma visible, sólo limita a quien no corresponde.
 */

/** `getTracker` es protegido; se accede por la instancia para poder probarlo. */
const clavePara = (req: Record<string, unknown>): Promise<string> => {
  const guard = Object.create(ThrottlePorUsuarioGuard.prototype) as {
    getTracker: (r: Record<string, unknown>) => Promise<string>;
  };
  return guard.getTracker(req);
};

describe('ThrottlePorUsuarioGuard — con qué clave cuenta', () => {
  it('usa el DNI cuando el cuerpo lo trae', async () => {
    await expect(clavePara({ body: { dni: '40000006' }, ip: '1.2.3.4' })).resolves.toBe(
      'dni:40000006',
    );
  });

  /**
   * El caso que motivó el cambio: dos personas distintas desde la misma IP no
   * deben compartir cupo.
   */
  it('dos DNI distintos desde la misma IP no comparten clave', async () => {
    const unaPersona = await clavePara({ body: { dni: '40000006' }, ip: '200.1.1.1' });
    const otraPersona = await clavePara({ body: { dni: '42621796' }, ip: '200.1.1.1' });

    expect(unaPersona).not.toBe(otraPersona);
  });

  it('recorta los espacios del DNI, para que no abran un cupo aparte', async () => {
    await expect(clavePara({ body: { dni: '  40000006 ' }, ip: '1.2.3.4' })).resolves.toBe(
      'dni:40000006',
    );
  });

  it('cae en la IP cuando la petición no lleva DNI', async () => {
    await expect(clavePara({ body: {}, ip: '200.1.1.1' })).resolves.toBe('ip:200.1.1.1');
  });

  it('cae en la IP cuando no hay cuerpo', async () => {
    await expect(clavePara({ ip: '200.1.1.1' })).resolves.toBe('ip:200.1.1.1');
  });

  it('ignora un DNI que no sea texto', async () => {
    await expect(clavePara({ body: { dni: 40000006 }, ip: '200.1.1.1' })).resolves.toBe(
      'ip:200.1.1.1',
    );
  });

  /**
   * Sin prefijo, un DNI podría colisionar con una IP en el almacén compartido y
   * dos actores sin relación se restarían intentos entre sí.
   */
  it('separa los dos espacios de nombres con un prefijo', async () => {
    const porDni = await clavePara({ body: { dni: '10001000' }, ip: '9.9.9.9' });
    const porIp = await clavePara({ body: {}, ip: '10001000' });

    expect(porDni).toBe('dni:10001000');
    expect(porIp).toBe('ip:10001000');
    expect(porDni).not.toBe(porIp);
  });
});
