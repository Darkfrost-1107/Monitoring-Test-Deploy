import type { Cronograma } from '@/entities/model-cronogramas';
import { formatearFechaClave } from '@shared/lib/calendario/grid';
import { clasePuntoEstado } from '../../lib/visita-presentacion';

const NOMBRES_DE_MES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Iniciales de los días, de domingo a sábado, para las cuadrículas reducidas. */
const INICIALES_DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Días de un mes precedidos por los huecos hasta su primer día de semana.
 *
 * Se construye acá y no en `shared/lib/calendario` porque la cuadrícula anual
 * no rellena con días contiguos: deja huecos vacíos, que es una forma distinta
 * a la de `construirCuadriculaMensual`.
 */
const diasDelMes = (anio: number, mes: number): (number | null)[] => {
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const totalDias = new Date(anio, mes + 1, 0).getDate();

  return [
    ...Array.from({ length: primerDiaSemana }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
};

interface VistaAnualProps {
  anio: number;
  visitas: Cronograma[];
  /** Abre el mes indicado en vista mensual, opcionalmente en un día concreto. */
  onAbrirMes: (mes: number, dia?: number) => void;
  onSeleccionarDia: (fecha: string, visitaId?: string) => void;
}

/** Los doce meses del año en cuadrículas reducidas, con marca en los días con visita. */
export const VistaAnual = ({ anio, visitas, onAbrirMes, onSeleccionarDia }: VistaAnualProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
    {NOMBRES_DE_MES.map((nombreMes, mes) => (
      <div
        key={mes}
        onClick={() => onAbrirMes(mes)}
        className="border border-border rounded-xl p-3 bg-surface hover:bg-slate-50/30 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
      >
        <h3 className="text-xs font-black text-slate-800 text-center uppercase tracking-wider mb-2 border-b border-border pb-1">
          {nombreMes}
        </h3>

        <div className="grid grid-cols-7 gap-0.5 text-[8px] font-bold text-center text-slate-400 mb-1">
          {INICIALES_DIAS.map((inicial, idx) => (
            <div key={idx}>{inicial}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-slate-600">
          {diasDelMes(anio, mes).map((dia, idx) => {
            if (dia === null) return <div key={idx}></div>;

            const fecha = formatearFechaClave(anio, mes, dia);
            const primeraVisita = visitas.find((v) => v.fechaHora.substring(0, 10) === fecha);

            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onAbrirMes(mes, dia);
                  onSeleccionarDia(fecha, primeraVisita?.id);
                }}
                className={`py-0.5 rounded font-medium relative hover:bg-slate-200 transition-all ${
                  primeraVisita ? 'font-bold bg-primary-light/60 text-primary' : ''
                }`}
              >
                {dia}
                {primeraVisita && (
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${clasePuntoEstado(
                      primeraVisita.estado,
                    )}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);
