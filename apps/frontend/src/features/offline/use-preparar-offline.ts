import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PAGINATION } from '@shared/config/constants';
import { cronogramasApi } from '@features/cronogramas/api/cronogramas.api';
import { especialistasApi } from '@shared/api/especialistas.api';
import { institutionsApi } from '@shared/api/institutions.api';
import { teachersApi } from '@shared/api/teachers.api';
import { plantillasApi } from '@entities/model-plantillas/api/plantillas.api';
import { mapIPlantillaListToPlantillaList } from '@entities/model-plantillas/mapper';
import { fichasApi } from '@features/monitoreos/api/fichas.api';
import { fichaAEstadoFormulario } from '@features/monitoreos/lib/ficha-estado';
import { safeSetLocalStorage } from '@shared/lib/utils';
import type { Plantilla } from '@entities/model-plantillas';
import type { IVisita } from '@sistema-monitoreo/shared-contracts';

/**
 * "Preparar para trabajar sin conexión": el especialista, con señal, descarga por
 * adelantado los datos que va a necesitar en campo.
 *
 * No mantiene un almacén aparte: pre-carga las MISMAS consultas de TanStack Query
 * que usan el calendario y la ficha (idénticas queryKey y queryFn), de modo que el
 * cache persistido en IndexedDB (ver `query-persistence.ts`) queda tibio y esas
 * pantallas lo encuentran offline sin cambiar una línea de su código.
 *
 * Cubre: cronogramas, solicitudes, especialistas, instituciones, docentes, el
 * catálogo de plantillas mapeadas, y el historial de fichas de sus visitas.
 */
export type EstadoPreparacion = 'idle' | 'preparando' | 'listo' | 'error';

export const OFFLINE_PREPARADO_KEY = 'sistema-monitoreo:offline-preparado-at';

export function usePrepararOffline() {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<EstadoPreparacion>(() => {
    if (typeof window === 'undefined') return 'idle';
    const guardado = localStorage.getItem(OFFLINE_PREPARADO_KEY);
    if (!guardado) return 'idle';
    const diff = Date.now() - new Date(guardado).getTime();
    // Considerar listo si se preparó hace menos de 24 horas
    return diff < 1000 * 60 * 60 * 24 ? 'listo' : 'idle';
  });

  const preparar = async (): Promise<boolean> => {
    setEstado('preparando');
    try {
      await Promise.all([
        qc.ensureQueryData({ queryKey: ['cronogramas'], queryFn: () => cronogramasApi.findAll() }),
        qc.ensureQueryData({
          queryKey: ['especialistas-lite'],
          queryFn: async () => {
            const res = await especialistasApi.findAll();
            if (!res.ok) throw (res.error instanceof Error ? res.error : new Error('No se pudo cargar especialistas'));
            return res;
          },
        }),
        qc.ensureQueryData({
          queryKey: ['instituciones-lite'],
          queryFn: async () => {
            const res = await institutionsApi.findAll({ limit: PAGINATION.MAX_LIMIT });
            if (!res.ok) throw (res.error instanceof Error ? res.error : new Error('No se pudo cargar instituciones'));
            return res;
          },
        }),
        qc.ensureQueryData({
          queryKey: ['docentes-lite'],
          queryFn: async () => {
            const res = await teachersApi.findAll();
            if (!res.ok) throw (res.error instanceof Error ? res.error : new Error('No se pudo cargar docentes'));
            return res;
          },
        }),
        qc.ensureQueryData({
          queryKey: ['solicitudes-all'],
          queryFn: () => cronogramasApi.findAllSolicitudes(),
        }),
        qc.ensureQueryData({
          queryKey: ['plantillas', undefined],
          queryFn: async () => {
            const data = await plantillasApi.findAll();
            return mapIPlantillaListToPlantillaList(data);
          },
        }),
      ]);

      // 1. Sembrar cada plantilla individual para que usePlantilla(id) responda de inmediato offline
      const plantillas = qc.getQueryData<Plantilla[]>(['plantillas', undefined]);
      if (plantillas && Array.isArray(plantillas)) {
        for (const p of plantillas) {
          qc.setQueryData(['plantilla', p.id], p);
        }
      }

      // 2. Pre-cargar fichas de visitas programadas procesando en lotes pequeños
      // para no saturar el servidor ni disparar 429 Too Many Requests (ThrottlerGuard).
      const cronos = qc.getQueryData<IVisita[]>(['cronogramas']);
      if (cronos && Array.isArray(cronos)) {
        const visitasAProcesar = cronos.slice(0, 15);
        for (let i = 0; i < visitasAProcesar.length; i += 2) {
          const lote = visitasAProcesar.slice(i, i + 2);
          await Promise.allSettled(
            lote.map(async (c) => {
              try {
                const fichas = await fichasApi.findAllByVisita(c.id);
                qc.setQueryData(['fichas', 'visita', c.id], fichas);
                if (fichas && fichas.length > 0) {
                  qc.setQueryData(['ficha', 'visita', c.id], fichas[0]);
                  qc.setQueryData(['ficha-completada', c.id], fichas[0]);
                  for (const f of fichas) {
                    qc.setQueryData(['ficha', f.id], f);
                    const estadoFormulario = JSON.stringify(fichaAEstadoFormulario(f));
                    const claveConPlantilla = `sistema-monitoreo:ficha-state:${c.id}:${f.plantillaId}`;
                    const claveSinPlantilla = `sistema-monitoreo:ficha-state:${c.id}`;
                    if (!localStorage.getItem(claveConPlantilla)) {
                      safeSetLocalStorage(claveConPlantilla, estadoFormulario);
                    }
                    if (!localStorage.getItem(claveSinPlantilla)) {
                      safeSetLocalStorage(claveSinPlantilla, estadoFormulario);
                    }
                  }
                }
              } catch {
                // Silencioso por visita para que un fallo individual no aborte la preparación global
              }
            }),
          );
          if (i + 2 < visitasAProcesar.length) {
            await new Promise((r) => setTimeout(r, 60));
          }
        }
      }

      safeSetLocalStorage(OFFLINE_PREPARADO_KEY, new Date().toISOString());
      setEstado('listo');
      return true;
    } catch {
      setEstado('error');
      return false;
    }
  };

  return { estado, preparar };
}

