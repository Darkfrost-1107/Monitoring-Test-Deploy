import { FEATURES } from '@shared/config/features';
import { safeSetLocalStorage } from '@/shared/lib/utils';
import type { DatosFicha } from './ficha-estado';

/**
 * Relleno de demostración para una ficha marcada como completada sin respaldo
 * en el backend.
 *
 * Fase 5 de PLAN_REMEDIACION.md. Estaban escritos dentro de `CalendarioSidebar`:
 * cuarenta líneas de datos de ejemplo —incluido un comentario de monitoreo
 * redactado— en un componente de producción.
 *
 * No se ejecuta con `FEATURES.apiOnly` activo, de modo que en un despliegue real
 * no escribe nada. Existe para que las demostraciones puedan abrir una ficha
 * cerrada sin haberla llenado antes.
 */
const FICHA_DE_DEMOSTRACION: DatosFicha = {
  checkedAspects: {
    d1_a1: true,
    d1_a2: true,
    d1_a3: true,
    d2_a1: true,
    d2_a2: true,
    d2_a3: true,
    ad2_1: true,
    ad2_2: true,
    ad2_3: true,
    ad3_1: true,
    ad3_2: true,
    ad3_3: true,
  },
  selectedLevels: { d1: 'III', d2: 'III', d3: 'IV', dd1: 'III', dd2: 'III', dd3: 'IV' },
  generalComments:
    'El monitoreo se desarrolló conforme a los compromisos de gestión. Se observa una adecuada planificación didáctica, alta concentración de alumnos en tareas significativas y un clima de aula respetuoso y participativo. Se recomienda continuar con las jornadas de reflexión interna.',
  sugerencias: 'Continuar fortaleciendo las competencias pedagógicas y de liderazgo directivo.',
  compromisos:
    'El directivo se compromete a realizar un seguimiento mensual a las sugerencias brindadas.',
  rubricComments: {},
  respuestasEjeItem: {},
  evidenciaUrls: {},
};

export const sembrarFichaDeDemostracion = (visitId: string): void => {
  if (FEATURES.apiOnly) return;
  safeSetLocalStorage(
    `sistema-monitoreo:ficha-state:${visitId}`,
    JSON.stringify(FICHA_DE_DEMOSTRACION),
  );
};
