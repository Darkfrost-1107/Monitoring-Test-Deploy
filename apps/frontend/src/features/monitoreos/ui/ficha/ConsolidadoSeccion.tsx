import { Trophy } from 'lucide-react';
import { romanoANivel } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla } from '@/entities/model-plantillas';
import { aNivelRomano } from '../../lib/ficha-estado';

type NivelPlantilla = Plantilla['niveles'][number];

/** Gris de respaldo para un nivel sin color en la plantilla. */
const COLOR_SIN_NIVEL = '#94a3b8';

/** Resultado ya calculado con el baremo del contrato compartido. */
export interface CalificacionConsolidada {
  puntajeTotal: number;
  puntajeMax: number;
  porcentaje: number;
  nivel: string;
  nivelColor: string;
  nivelBg: string;
}

/** Una línea del consolidado, sin importar si viene de un desempeño o de un eje. */
interface FilaConsolidado {
  clave: string;
  codigo: string;
  descripcion: string;
  romano: string | null;
  puntaje: number;
}

interface ConsolidadoSeccionProps {
  desempenos: Plantilla['desempenos'];
  ejesItems: Plantilla['ejesItems'];
  niveles: NivelPlantilla[];
  nivelesElegidos: Record<string, string>;
  respuestasEjeItem: Record<string, number>;
  calificacion: CalificacionConsolidada;
}

const CLASES_ENCABEZADO =
  'p-3 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]';

/**
 * Tabla resumen con lo calificado y el nivel de logro alcanzado.
 *
 * El cálculo no ocurre acá: llega resuelto por el baremo del contrato
 * compartido, que es el mismo que aplica el backend al persistir (H-28).
 */
export const ConsolidadoSeccion = ({
  desempenos,
  ejesItems,
  niveles,
  nivelesElegidos,
  respuestasEjeItem,
  calificacion,
}: ConsolidadoSeccionProps) => {
  const colorDeNivel = (romano: string | null) =>
    (romano ? niveles.find((n) => n.nivel === romano)?.color : null) ?? COLOR_SIN_NIVEL;

  const filas: FilaConsolidado[] = [
    ...desempenos.map((des, idx) => {
      const romano = nivelesElegidos[des.id] || null;
      return {
        clave: des.id,
        codigo: `D${idx + 1}`,
        descripcion: des.nombre,
        romano,
        puntaje: romanoANivel(romano ?? ''),
      };
    }),
    ...(ejesItems ?? []).map((item) => {
      const puntaje = respuestasEjeItem[item.id] ?? 0;
      return {
        clave: item.id,
        codigo: `R${item.numero}`,
        descripcion: item.descripcion,
        romano: puntaje > 0 ? aNivelRomano(puntaje) : null,
        puntaje,
      };
    }),
  ];

  return (
    <div
      className="p-5 border-t border-border"
      style={{ backgroundColor: `${calificacion.nivelBg}cc` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4.5 w-4.5" style={{ color: calificacion.nivelColor }} />
        <span
          className="text-[11px] font-extrabold uppercase tracking-widest"
          style={{ color: calificacion.nivelColor }}
        >
          CONSOLIDADO DE NIVELES DE LOGRO
        </span>
      </div>

      <div className="bg-white/80 rounded-xl border border-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={`text-left ${CLASES_ENCABEZADO}`}>N°</th>
              <th className={`text-left ${CLASES_ENCABEZADO}`}>ASPECTOS (Desempeños)</th>
              <th className={`text-center w-20 ${CLASES_ENCABEZADO}`}>NIVEL</th>
              <th className={`text-center w-16 ${CLASES_ENCABEZADO}`}>PUNTAJE</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, idx) => {
              const color = colorDeNivel(fila.romano);

              return (
                <tr key={fila.clave} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-3 text-slate-400 font-bold text-center w-8">{fila.codigo}</td>
                  <td className="p-3 text-slate-700 font-medium leading-snug">{fila.descripcion}</td>
                  <td className="p-3 text-center">
                    {fila.romano ? (
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        Nivel {fila.romano}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic text-[10px]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-black text-slate-700">
                    {fila.puntaje > 0 ? fila.puntaje : '—'}
                  </td>
                </tr>
              );
            })}

            <tr className="border-t border-slate-200 bg-slate-50/50">
              <td
                colSpan={3}
                className="p-3 font-bold text-slate-500 text-[11px] text-right uppercase tracking-wider"
              >
                TOTAL (Desempeños D1-D5)
              </td>
              <td
                className="p-3 text-center font-black text-base"
                style={{ color: calificacion.nivelColor }}
              >
                {calificacion.puntajeTotal} / {calificacion.puntajeMax}
              </td>
            </tr>

            <tr style={{ backgroundColor: `${calificacion.nivelColor}10` }}>
              <td
                colSpan={3}
                className="p-3 font-black text-slate-700 text-xs text-right uppercase tracking-wider"
              >
                NIVEL DE LOGRO ALCANZADO
              </td>
              <td
                className="p-3 text-center font-black text-sm"
                style={{ color: calificacion.nivelColor }}
              >
                {calificacion.nivel} ({calificacion.porcentaje}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
