import { authApi } from './auth.api';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export const setupFetchInterceptor = () => {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    // Configurar credentials por defecto y Bearer token si existe
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (typeof args[0] === 'string' || args[0] instanceof URL) {
      args[1] = args[1] || {};
      if (args[1].credentials === undefined) {
        args[1].credentials = 'include';
      }
      if (token) {
        const headers = new Headers(args[1].headers);
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
          args[1].headers = headers;
        }
      }
    } else if (args[0] instanceof Request) {
      if (token && !args[0].headers.has('Authorization')) {
        args[0].headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await originalFetch(...args);

    if (response.status === 401) {
      let urlStr = '';
      if (typeof args[0] === 'string') {
        urlStr = args[0];
      } else if (args[0] instanceof URL) {
        urlStr = args[0].toString();
      } else if (args[0] instanceof Request) {
        urlStr = args[0].url;
      }

      // Solo las rutas públicas de auth (login, refresh, forgot/reset password) no deben reintentar refresco.
      // Rutas protegidas bajo /api/auth/ (como /api/auth/perfil o change-password) sí deben refrescar el token si expiró.
      const isPublicAuthUrl =
        urlStr.includes('/api/auth/login') ||
        urlStr.includes('/api/auth/refresh') ||
        urlStr.includes('/api/auth/forgot-password') ||
        urlStr.includes('/api/auth/reset-password');
      if (!isPublicAuthUrl) {
        if (!isRefreshing) {
          isRefreshing = true;
          const storedRefreshToken =
            typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
          // Enviamos el refreshToken guardado o 'from-cookie' para retrocompatibilidad
          refreshPromise = authApi
            .refreshToken(storedRefreshToken || 'from-cookie')
            .then((res) => {
              isRefreshing = false;
              if (res.ok && res.data) {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('accessToken', res.data.accessToken);
                  localStorage.setItem('refreshToken', res.data.refreshToken);
                }
                return true;
              }
              return false;
            })
            .catch(() => {
              isRefreshing = false;
              return false;
            });
        }

        const success = await refreshPromise;
        if (success) {
          const newToken =
            typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
          // Reintentar la llamada original actualizando el header de autorización
          if (typeof args[0] === 'string' || args[0] instanceof URL) {
            const url = args[0];
            const options = { ...(args[1] as RequestInit) };
            if (newToken) {
              const headers = new Headers(options.headers);
              headers.set('Authorization', `Bearer ${newToken}`);
              options.headers = headers;
            }
            return await originalFetch(url, options);
          } else if (args[0] instanceof Request) {
            const req = args[0].clone();
            if (newToken) {
              req.headers.set('Authorization', `Bearer ${newToken}`);
            }
            return await originalFetch(req, args[1] as RequestInit);
          }
        }

        console.warn(
          'HTTP Interceptor: Token expirado y sin token de refresco válido. Forzando deslogueo...',
        );
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        window.dispatchEvent(new Event('auth-invalidation'));
      }
    }

    return response;
  };
};
