import { lemaDelAnio } from '@features/reportes/lib/lema-del-anio';

/**
 * Membrete del Estado y título de la ficha.
 *
 * El lema del año estaba escrito a mano —fijo en el de 2025— dentro del JSX.
 * Ahora sale de `lemaDelAnio`, que devuelve nulo antes que un lema vencido: un
 * encabezado oficial equivocado es peor que ninguno.
 */

interface Props {
  anioAcademico: number | string;
  esDirectivo: boolean;
}

export const EncabezadoOficial = ({ anioAcademico, esDirectivo }: Props) => {
  const lema = lemaDelAnio(anioAcademico);

  return (
    <>
      <div className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center justify-between text-center mb-2">
          <div className="text-left font-bold text-[9px] uppercase leading-tight text-slate-700">
            <p>Ministerio de Educación</p>
            <p>Dirección Regional de Educación Puno</p>
            <p className="text-primary font-black">UGEL Lampa</p>
          </div>
          <div className="text-center font-bold text-[10px] uppercase leading-tight text-slate-800">
            <p className="font-extrabold text-xs">UNIDAD DE GESTIÓN EDUCATIVA LOCAL LAMPA</p>
            <p className="text-[9px] text-slate-600 font-medium">ÁREA DE GESTIÓN PEDAGÓGICA</p>
          </div>
          <div className="text-right text-[9px] text-slate-500 italic">
            <p>Sistema de Monitoreo</p>
            <p>UGEL Lampa - Puno</p>
          </div>
        </div>

        {lema && (
          <div className="text-center italic text-[9px] text-slate-600 pt-1 border-t border-slate-200">
            &laquo;{lema}&raquo;
          </div>
        )}
      </div>

      <div className="pdf-doc-title">
        {esDirectivo
          ? `FICHA DE MONITOREO Y ACOMPAÑAMIENTO AL DIRECTOR(A) DE I.E. - ${anioAcademico}`
          : `FICHA DE MONITOREO Y ACOMPAÑAMIENTO AL DESEMPEÑO DOCENTE - ${anioAcademico}`}
      </div>
    </>
  );
};
