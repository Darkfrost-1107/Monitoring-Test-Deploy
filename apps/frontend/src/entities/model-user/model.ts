import type { UserRole } from '@sistema-monitoreo/shared-contracts';

export interface User {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  role: UserRole;
  /**
   * Capacidades efectivas que emite el backend al iniciar sesión.
   *
   * Se consultan con `useCan()`; no comparar `role` contra literales para
   * decidir qué mostrar. Opcional porque una sesión persistida en
   * `localStorage` antes de la Fase 2 no las tiene: `useCan` trata la ausencia
   * como conjunto vacío.
   */
  permissions?: string[];
  institucion?: string;
  institucionNombre?: string;
  institucionNivel?: string;
  especialistaId?: string;
  especialistaNivel?: string;
  especialistaEspecialidades?: string[];
  especialistaModalidad?: string;
  distrito?: string;
  firstLogin: boolean;
}
