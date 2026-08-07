import type { ReactNode } from 'react';

interface CampoDetalleProps {
  etiqueta: string;
  children: ReactNode;
  className?: string;
}

/**
 * Un dato del panel de detalle: su etiqueta y su contenido.
 *
 * La misma estructura de etiqueta en versalitas sobre el valor se repetía ocho
 * veces en `CalendarioSidebar`, cada una con su cadena de clases copiada. Un
 * ajuste tipográfico obligaba a tocar las ocho y acertar en todas.
 */
export const CampoDetalle = ({ etiqueta, children, className = 'space-y-1' }: CampoDetalleProps) => (
  <div className={className}>
    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
      {etiqueta}
    </span>
    {children}
  </div>
);
