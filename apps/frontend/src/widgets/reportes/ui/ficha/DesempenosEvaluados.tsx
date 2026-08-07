import type { Plantilla } from '@entities/model-plantillas';
import { nivelNumericoARomano } from '@features/reportes/lib/nivel-logro';

/**
 * Los desempeños evaluados y la tabla de ejes e ítems.
 *
 * Eran ciento veinte líneas dentro de `FichaPrintable`. La conversión de nivel
 * numérico a romano estaba escrita otra vez acá, como un arreglo indexado con
 * un hueco al frente: `['', 'I', 'II', 'III', 'IV'][nivel]`.
 */

/** Color de cada nivel, en la paleta del documento impreso. */
const COLOR_POR_NIVEL: Record<string, { fondo: string; texto: string; borde: string }> = {
  I: { fondo: '#fee2e2', texto: '#991b1b', borde: '#fca5a5' },
  II: { fondo: '#ffedd5', texto: '#c2410c', borde: '#fdba74' },
  III: { fondo: '#dcfce7', texto: '#166534', borde: '#86efac' },
  IV: { fondo: '#ccfbf1', texto: '#0f766e', borde: '#99f6e4' },
};

const SIN_NIVEL = { fondo: '#f1f5f9', texto: '#475569', borde: '#cbd5e1' };

const colorDeNivel = (nivel: string) => COLOR_POR_NIVEL[nivel] ?? SIN_NIVEL;

interface EstadoDeDesempenos {
  checkedAspects: Record<string, boolean>;
  selectedLevels: Record<string, string>;
  rubricComments?: Record<string, string>;
  preguntaExtraAnswers?: Record<string, boolean>;
  respuestasEjeItem?: Record<string, number>;
  observacionesEjeItem?: Record<string, string>;
}

export const DesempenosEvaluados = ({
  desempenos,
  estado,
}: {
  desempenos: Plantilla['desempenos'];
  estado: EstadoDeDesempenos;
}) => (
  <div className="space-y-3">
    <div className="pdf-major-title">I. DESEMPEÑOS EVALUADOS</div>

    {desempenos.map((desempeno, indice) => {
      const nivel = estado.selectedLevels[desempeno.id];
      const color = colorDeNivel(nivel);

      return (
        <div key={desempeno.id} className="pdf-block break-inside-avoid">
          <div className="flex justify-between items-start gap-4 mb-2">
            <h3 className="font-bold text-[12px]">
              {indice + 1}. {desempeno.nombre}
            </h3>
            {nivel && (
              <div
                className="shrink-0 px-2 py-0.5 font-bold text-[10px] border"
                style={{ backgroundColor: color.fondo, color: color.texto, borderColor: color.texto }}
              >
                Nivel {nivel}
              </div>
            )}
          </div>

          <p className="text-slate-600 italic mb-3">{desempeno.descripcionCorta}</p>

          {desempeno.aspectos?.length > 0 && (
            <div className="mt-3 mb-3 text-[11px]">
              <p className="font-bold text-slate-700 mb-1">Aspectos a Considerar:</p>
              <div className="space-y-1 pl-2">
                {desempeno.aspectos.map((aspecto) => (
                  <div key={aspecto.id} className="flex items-start gap-2 text-slate-800">
                    <span
                      className={`pdf-bullet mt-[3px] ${estado.checkedAspects[aspecto.id] ? 'checked' : ''}`}
                    />
                    <span>{aspecto.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {desempeno.preguntaExtra && (
            <div className="bg-slate-50 border border-slate-400 p-2 mb-3 text-xs">
              <span className="font-bold">Pregunta:</span> {desempeno.preguntaExtra}
              <br />
              <span className="font-bold mt-1 inline-block">Respuesta:</span>{' '}
              {respuestaEnTexto(estado.preguntaExtraAnswers?.[desempeno.id])}
            </div>
          )}

          {nivel && (
            <div className="text-xs border-l-2 pl-3 mt-3" style={{ borderColor: color.texto }}>
              <p className="font-bold mb-1 text-slate-700">Justificación y Evidencias:</p>
              <p className="text-slate-800 whitespace-pre-wrap">
                {estado.rubricComments?.[desempeno.id] || 'Sin justificación registrada.'}
              </p>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

/** Un «no» es una respuesta; distinta de no haber respondido. */
const respuestaEnTexto = (respuesta: boolean | undefined): string => {
  if (respuesta === true) return 'SÍ';
  if (respuesta === false) return 'NO';
  return 'Sin responder';
};

export const EjesEItems = ({
  items,
  estado,
}: {
  items: NonNullable<Plantilla['ejesItems']>;
  estado: EstadoDeDesempenos;
}) => (
  <div className="space-y-3 mt-6 break-before-auto">
    <div className="pdf-major-title">II. EJES E ITEMS</div>
    <table className="pdf-table" style={{ marginBottom: '20px' }}>
      <thead>
        <tr>
          <td className="bg-gray text-center" style={{ width: '5%' }}>
            N°
          </td>
          <td className="bg-gray">Descripción</td>
          <td className="bg-gray text-center" style={{ width: '12%' }}>
            Nivel
          </td>
          <td className="bg-gray" style={{ width: '30%' }}>
            Observaciones
          </td>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const romano = nivelNumericoARomano(estado.respuestasEjeItem?.[item.id]);

          return (
            <tr key={item.id}>
              <td className="text-center font-bold">{item.numero}</td>
              <td>{item.descripcion}</td>
              <td className="text-center font-bold">{romano ? `Nivel ${romano}` : '-'}</td>
              <td className="whitespace-pre-wrap">
                {estado.observacionesEjeItem?.[item.id] || '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
