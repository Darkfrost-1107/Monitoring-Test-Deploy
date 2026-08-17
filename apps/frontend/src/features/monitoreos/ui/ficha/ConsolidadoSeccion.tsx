import { useMemo, useCallback } from 'react';
import { Trophy, CheckCircle2 } from 'lucide-react';
import { romanoANivel } from '@sistema-monitoreo/shared-contracts';
import type { Plantilla } from '@/entities/model-plantillas';
import { esEscalaCualitativa, resumirPorNivel } from '@/entities/model-plantillas';
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
  denominacion: string | null;
  color: string;
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
 * Para instrumentos cualitativos (como la Ficha Docente EIB con escala Sí /
 * Parcialmente / No), muestra un resumen de frecuencias sin puntajes
 * matemáticos ficticios.
 */
export const ConsolidadoSeccion = ({
  desempenos,
  ejesItems,
  niveles,
  nivelesElegidos,
  respuestasEjeItem,
  calificacion,
}: ConsolidadoSeccionProps) => {
  const esCualitativo = useMemo(() => esEscalaCualitativa(niveles), [niveles]);

  const colorDeNivel = useCallback(
    (romano: string | null) =>
      (romano ? niveles.find((n) => n.nivel === romano)?.color : null) ?? COLOR_SIN_NIVEL,
    [niveles],
  );

  const denominacionDeNivel = useCallback(
    (romano: string | null) =>
      romano ? niveles.find((n) => n.nivel === romano)?.denominacion ?? `Nivel ${romano}` : null,
    [niveles],
  );

  const filas: FilaConsolidado[] = [
    ...desempenos.map((des, idx) => {
      const romano = nivelesElegidos[des.id] || null;
      return {
        clave: des.id,
        codigo: `D${idx + 1}`,
        descripcion: des.nombre,
        romano,
        denominacion: denominacionDeNivel(romano),
        color: colorDeNivel(romano),
        puntaje: romanoANivel(romano ?? ''),
      };
    }),
    ...(ejesItems ?? []).map((item) => {
      const puntaje = respuestasEjeItem[item.id] ?? 0;
      const romano = puntaje > 0 ? aNivelRomano(puntaje) : null;
      return {
        clave: item.id,
        codigo: `R${item.numero}`,
        descripcion: item.descripcion,
        romano,
        denominacion: denominacionDeNivel(romano),
        color: colorDeNivel(romano),
        puntaje,
      };
    }),
  ];

  const resumen = useMemo(
    () =>
      esCualitativo
        ? resumirPorNivel(
            desempenos.map((des) => des.id),
            niveles,
            nivelesElegidos,
          )
        : null,
    [esCualitativo, desempenos, niveles, nivelesElegidos],
  );

  if (resumen) {
    return (
      <div className="p-5 border-t border-border bg-slate-50/80">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-800">
            CONSOLIDADO CUALITATIVO DE OBSERVACIÓN EN AULA
          </span>
        </div>

        {/* Una tarjeta por nivel que declara la escala, con su propio color. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {resumen.porNivel.map((conteo) => (
            <div
              key={conteo.nivel}
              className="p-3.5 rounded-xl border bg-white shadow-2xs flex items-center justify-between"
              style={{ borderColor: `${conteo.color}40` }}
            >
              <div className="space-y-0.5">
                <span
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: conteo.color }}
                >
                  {conteo.denominacion}
                </span>
                <p className="text-xl font-black text-slate-800">
                  {conteo.cantidad}{' '}
                  <span className="text-xs font-bold text-slate-500">/ {resumen.total}</span>
                </p>
              </div>
              <span
                className="text-xs font-extrabold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: `${conteo.color}20`, color: conteo.color }}
              >
                {conteo.porcentaje}%
              </span>
            </div>
          ))}

          {/* Lo no marcado se declara: antes se perdía del conteo en silencio. */}
          {resumen.sinValorar.cantidad > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 shadow-2xs flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Sin valorar
                </span>
                <p className="text-xl font-black text-slate-700">
                  {resumen.sinValorar.cantidad}{' '}
                  <span className="text-xs font-bold text-slate-500">/ {resumen.total}</span>
                </p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600">
                {resumen.sinValorar.porcentaje}%
              </span>
            </div>
          )}
        </div>

        {/* Tabla Detallada Cualitativa */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className={`text-left ${CLASES_ENCABEZADO} w-10`}>N°</th>
                <th className={`text-left ${CLASES_ENCABEZADO}`}>CRITERIO PEDAGÓGICO / ÍTEM OBSERVABLE</th>
                <th className={`text-center w-36 ${CLASES_ENCABEZADO}`}>VALORACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, idx) => (
                <tr key={fila.clave} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                  <td className="p-2.5 text-slate-400 font-bold text-center">{fila.codigo}</td>
                  <td className="p-2.5 text-slate-700 font-medium leading-snug">{fila.descripcion}</td>
                  <td className="p-2.5 text-center">
                    {fila.denominacion ? (
                      <span
                        className="inline-block px-3 py-1 rounded-full text-[10.5px] font-black"
                        style={{ backgroundColor: `${fila.color}15`, color: fila.color }}
                      >
                        {fila.denominacion}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Instrumento Cuantitativo Regular (Monitoreo Docente EBR 5 Desempeños / Directivo)
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
              const color = fila.color;

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
