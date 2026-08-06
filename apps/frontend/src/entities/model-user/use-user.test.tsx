import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { UserProvider } from './context';
import { useUser } from './use-user';
import type { User } from './model';

/**
 * Pruebas de caracterización de la entidad usuario.
 *
 * Fase 3 de PLAN_REMEDIACION.md. `useUser` tiene 73 consumidores y estaba sin
 * cobertura: es el símbolo de mayor radio de impacto del frontend.
 *
 * Fijan el comportamiento ACTUAL, incluidas las decisiones que nadie dejó
 * escritas —la sesión se persiste en `localStorage`, un JSON corrupto se trata
 * como ausencia de sesión, el cierre no espera al backend—. No juzgan si ese
 * comportamiento es el correcto: existen para que las Fases 5 y 6 puedan
 * descomponer la interfaz y detectar si alguna de estas conductas cambia sin
 * querer.
 */

const { logoutMock, changePasswordMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  changePasswordMock: vi.fn(),
}));

vi.mock('@/shared/api/auth.api', () => ({
  authApi: {
    logout: logoutMock,
    changePassword: changePasswordMock,
  },
}));

const usuario = (over: Partial<User> = {}): User => ({
  id: 'u-1',
  dni: '40000001',
  nombres: 'Carlos',
  apellidos: 'Mendoza',
  role: RoleCode.ESPECIALISTA,
  permissions: ['monitoreo:execute'],
  firstLogin: false,
  ...over,
});

const envoltorio = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>{children}</UserProvider>
    </QueryClientProvider>
  );
};

const montar = () => renderHook(() => useUser(), { wrapper: envoltorio });

beforeEach(() => {
  localStorage.clear();
  logoutMock.mockReset().mockResolvedValue(undefined);
  changePasswordMock.mockReset().mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useUser', () => {
  it('falla de forma explícita si se usa fuera del proveedor', () => {
    // Sin este error, un componente mal ubicado recibiría `undefined` y fallaría
    // más tarde y más lejos del origen.
    expect(() => renderHook(() => useUser())).toThrow(/UserProvider/);
  });

  it('expone el contexto cuando está dentro del proveedor', () => {
    const { result } = montar();

    expect(result.current).toEqual(
      expect.objectContaining({
        user: null,
        isAuthenticated: false,
        setUser: expect.any(Function),
        logout: expect.any(Function),
        changePassword: expect.any(Function),
      }),
    );
  });
});

describe('UserProvider — rehidratación de la sesión', () => {
  it('arranca sin usuario cuando no hay nada persistido', () => {
    const { result } = montar();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('recupera la sesión persistida en localStorage', () => {
    localStorage.setItem('user', JSON.stringify(usuario()));

    const { result } = montar();

    expect(result.current.user?.dni).toBe('40000001');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('trata un JSON corrupto como ausencia de sesión, sin propagar el error', () => {
    // Caracteriza el `catch` silencioso: la aplicación arranca en el login en
    // lugar de romperse con una pantalla en blanco.
    localStorage.setItem('user', '{esto no es json');

    const { result } = montar();

    expect(result.current.user).toBeNull();
  });

  it('conserva las capacidades al rehidratar', () => {
    // Son la base de `useCan`; perderlas al recargar dejaría el menú vacío.
    localStorage.setItem('user', JSON.stringify(usuario({ permissions: ['docentes:read'] })));

    const { result } = montar();

    expect(result.current.user?.permissions).toEqual(['docentes:read']);
  });
});

describe('UserProvider — persistencia', () => {
  it('persiste el usuario al iniciar sesión', () => {
    const { result } = montar();

    act(() => result.current.setUser(usuario()));

    expect(JSON.parse(localStorage.getItem('user') ?? '{}')).toEqual(
      expect.objectContaining({ dni: '40000001' }),
    );
  });

  it('borra lo persistido al dejar el usuario en nulo', () => {
    localStorage.setItem('user', JSON.stringify(usuario()));
    const { result } = montar();

    act(() => result.current.setUser(null));

    expect(localStorage.getItem('user')).toBeNull();
  });
});

describe('UserProvider — cierre de sesión', () => {
  it('limpia el estado local sin esperar la respuesta del backend', () => {
    // `authApi.logout()` se invoca sin await para no bloquear la interfaz: la
    // sesión local se cierra aunque el backend tarde o falle.
    logoutMock.mockReturnValue(new Promise(() => {}));
    localStorage.setItem('user', JSON.stringify(usuario()));
    const { result } = montar();

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(logoutMock).toHaveBeenCalled();
  });

  it('no propaga un fallo del backend al cerrar sesión', () => {
    logoutMock.mockRejectedValue(new Error('sin red'));
    const { result } = montar();

    expect(() => act(() => result.current.logout())).not.toThrow();
    expect(result.current.user).toBeNull();
  });

  it('retira los restos de tokens de versiones anteriores', () => {
    // Limpieza defensiva: antes los tokens vivían en localStorage; ahora el
    // backend los envía en cookies HttpOnly.
    localStorage.setItem('accessToken', 'viejo');
    localStorage.setItem('refreshToken', 'viejo');
    localStorage.setItem('ugel_penalty_expiry', '123');
    const { result } = montar();

    act(() => result.current.logout());

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('ugel_penalty_expiry')).toBeNull();
  });
});

describe('UserProvider — cambio de contraseña', () => {
  it('cierra la sesión tras un cambio correcto', async () => {
    // El backend invalida las cookies al cambiar la contraseña, de modo que la
    // sesión actual deja de servir y hay que volver a iniciarla.
    const { result } = montar();
    act(() => result.current.setUser(usuario()));

    await act(async () => {
      await result.current.changePassword('NuevaClave123');
    });

    expect(changePasswordMock).toHaveBeenCalledWith('NuevaClave123');
    expect(result.current.user).toBeNull();
  });

  it('propaga el mensaje de error del backend', async () => {
    changePasswordMock.mockResolvedValue({ ok: false, error: { message: 'Clave muy débil' } });
    const { result } = montar();

    await expect(result.current.changePassword('123')).rejects.toThrow('Clave muy débil');
  });

  it('usa un mensaje genérico cuando el backend no envía uno', async () => {
    changePasswordMock.mockResolvedValue({ ok: false, error: {} });
    const { result } = montar();

    await expect(result.current.changePassword('123')).rejects.toThrow(
      /Error al cambiar contraseña/,
    );
  });

  it('mantiene la sesión si el cambio falla', async () => {
    changePasswordMock.mockResolvedValue({ ok: false, error: { message: 'no' } });
    const { result } = montar();
    act(() => result.current.setUser(usuario()));

    await expect(result.current.changePassword('123')).rejects.toThrow();
    expect(result.current.user).not.toBeNull();
  });
});

describe('UserProvider — invalidación de sesión desde la red', () => {
  it('cierra la sesión al recibir el evento auth-invalidation', () => {
    // Lo emite el interceptor de red cuando el backend responde 401.
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/dashboard', assign });
    localStorage.setItem('user', JSON.stringify(usuario()));
    const { result } = montar();

    act(() => {
      window.dispatchEvent(new Event('auth-invalidation'));
    });

    expect(result.current.user).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('no redirige si ya se está en el login', () => {
    // Evita un bucle de redirección cuando el 401 llega desde la propia
    // pantalla de acceso.
    const assign = vi.fn();
    vi.stubGlobal('location', { pathname: '/login', assign });
    const { result } = montar();

    act(() => {
      window.dispatchEvent(new Event('auth-invalidation'));
    });

    expect(result.current.user).toBeNull();
    expect(assign).not.toHaveBeenCalled();
  });
});
