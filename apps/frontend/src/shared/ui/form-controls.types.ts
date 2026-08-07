import type { CSSProperties } from 'react';

/**
 * Tipos, helpers y estilos de los controles de formulario.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Viven aparte de los componentes porque
 * `react-refresh/only-export-components` exige que un archivo no exporte a la
 * vez un componente y algo que no lo es. Separarlos permite retirar la
 * supresión en lugar de convivir con ella.
 */

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export const toOptions = (values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v }));

// Estilos de grillas en formato CSSProperties para compatibilidad
export const twoCols: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 18,
};

export const threeCols: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 18,
};
