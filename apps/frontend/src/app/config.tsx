import { type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Toaster } from 'sonner';
import { UserProvider } from '@entities/model-user';
import { setupFetchInterceptor } from '@shared/api/fetchInterceptor';
import { STALE_TIMES } from '@shared/config/constants';
import { persister, MAX_AGE_CACHE } from './query-persistence';

// 1. Activamos el interceptor global de red de la capa shared
setupFetchInterceptor();

// 2. Cliente de TanStack Query (cache, retries, deduplicacion de requests)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: STALE_TIMES.DEFAULT,
      // Sin conexión, la consulta devuelve el dato del cache en vez de quedar en
      // pausa: es lo que hace utilizable la app offline.
      networkMode: 'offlineFirst',
      // El cache debe vivir al menos lo que dura su persistencia; si no, se
      // recolecta antes y el usuario offline se queda sin dato.
      gcTime: MAX_AGE_CACHE,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

interface AppConfigProps {
  children: ReactNode;
}

// 3. Creamos el contenedor de configuración y proveedores globales
export const AppConfig = ({ children }: AppConfigProps) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: MAX_AGE_CACHE }}
    >
      <UserProvider>
        {children}
        <Toaster position="top-right" richColors />
      </UserProvider>
    </PersistQueryClientProvider>
  );
};
