import { jest } from '@jest/globals';
import { relevarDelCargo, esCargoUnico } from './relevar-del-cargo.helper.js';
import { RoleCode } from '../../common/enums/role.enum.js';

/**
 * Pruebas del relevo de un cargo único.
 *
 * Director de UGEL y Jefe de Gestión se ganan por examen: puede quedarlos un
 * especialista en ejercicio o alguien que nunca trabajó como tal. El sistema
 * devolvía a todo saliente al rol de especialista, lo que convertía al segundo
 * en un especialista que nunca fue y lo dejaba en el padrón como personal
 * activo, disponible para asignarle monitoreos.
 *
 * Lo que se fija acá es la decisión: quien vino de un rol lo recupera, y quien
 * entró desde afuera se da de baja. Ninguno de los dos caminos que relevan
 * —el panel del superusuario y el alta de una persona nueva— tenía cobertura.
 */

const armarCliente = (rolExiste = true) => {
  const cliente = {
    usuario: { update: jest.fn<any>().mockResolvedValue(undefined) },
    role: {
      findUnique: jest
        .fn<any>()
        .mockResolvedValue(rolExiste ? { id: 'rol-especialista-uuid' } : null),
    },
  };
  return cliente;
};

/** Los datos con que se actualizó al saliente. */
const datosDelUpdate = (cliente: { usuario: { update: jest.Mock } }) =>
  (cliente.usuario.update.mock.calls[0] as [{ data: Record<string, unknown> }])[0].data;

describe('relevarDelCargo — vino de un rol previo', () => {
  it('le devuelve el rol que ocupaba antes de asumir', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: RoleCode.ESPECIALISTA });

    expect(cliente.role.findUnique).toHaveBeenCalledWith({
      where: { codigo: RoleCode.ESPECIALISTA },
    });
    expect(datosDelUpdate(cliente)).toEqual({
      rolId: 'rol-especialista-uuid',
      rolPrevio: null,
    });
  });

  /**
   * Sin limpiarlo, el próximo relevo restauraría un rol de dos cargos atrás.
   */
  it('limpia el rol previo, que ya se usó', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: RoleCode.JEFE_AREA });

    expect(datosDelUpdate(cliente).rolPrevio).toBeNull();
  });

  it('no lo da de baja: sigue trabajando en su rol anterior', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: RoleCode.ESPECIALISTA });

    expect(datosDelUpdate(cliente)).not.toHaveProperty('isActive');
  });
});

describe('relevarDelCargo — entró desde afuera', () => {
  /**
   * Quien ganó el cargo por examen sin haber trabajado nunca en la UGEL no
   * tiene rol al cual volver. Devolverlo a «especialista» le inventaba un
   * puesto y lo dejaba disponible para que le asignaran monitoreos.
   */
  it('lo da de baja en vez de inventarle un puesto', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: null });

    expect(datosDelUpdate(cliente)).toEqual({ isActive: false, rolPrevio: null });
  });

  it('no le asigna ningún rol', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: null });

    expect(datosDelUpdate(cliente)).not.toHaveProperty('rolId');
  });

  it('no consulta el catálogo de roles: no hay ninguno que buscar', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: null });

    expect(cliente.role.findUnique).not.toHaveBeenCalled();
  });

  /**
   * La baja lógica conserva la fila. El usuario tiene historial de auditoría y
   * puede haber firmado fichas: borrarlo las dejaría sin autor.
   */
  it('la baja es lógica, no un borrado', async () => {
    const cliente = armarCliente();

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: null });

    expect(cliente.usuario.update).toHaveBeenCalledTimes(1);
    expect(datosDelUpdate(cliente).isActive).toBe(false);
  });
});

describe('relevarDelCargo — el rol previo ya no existe en el catálogo', () => {
  /**
   * Un resembrado puede haberse llevado el rol. Dar de baja es lo prudente:
   * dejarlo en el cargo que acaba de perder lo mantendría con los permisos de
   * un puesto que ya no ocupa.
   */
  it('lo da de baja en vez de dejarlo con el cargo que perdió', async () => {
    const cliente = armarCliente(false);

    await relevarDelCargo(cliente, { id: 'u-1', rolPrevio: 'rol_que_ya_no_existe' });

    expect(datosDelUpdate(cliente)).toEqual({ isActive: false, rolPrevio: null });
  });
});

describe('esCargoUnico', () => {
  it.each([[RoleCode.DIRECTOR_UGEL], [RoleCode.JEFE_GESTION]])(
    '%s admite un solo ocupante',
    (rol) => {
      expect(esCargoUnico(rol)).toBe(true);
    },
  );

  it.each([[RoleCode.ESPECIALISTA], [RoleCode.JEFE_AREA], [RoleCode.DIRECTOR_INSTITUCION]])(
    '%s no es un cargo único',
    (rol) => {
      expect(esCargoUnico(rol)).toBe(false);
    },
  );
});
