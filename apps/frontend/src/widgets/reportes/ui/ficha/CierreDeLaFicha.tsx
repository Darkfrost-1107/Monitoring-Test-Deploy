import type { Cronograma } from '@entities/model-cronogramas';
import type { Plantilla } from '@entities/model-plantillas';
import { formatearFechaCorta } from '@shared/lib/fecha/fecha';
import { consolidarFicha, puntajeDeDesempeno } from '@features/reportes/lib/consolidado-ficha';
import { TituloDeSeccion } from './tabla';
import { useQuery } from '@tanstack/react-query';
import { firmasApi } from '@/shared/api/firmas.api';
import { requestBlob } from '@/shared/config/api';
import { useEffect, useState } from 'react';

/**
 * El cierre de la ficha: sugerencias, consolidado, evidencias y firmas.
 *
 * El consolidado era una función anónima invocada en el sitio dentro del JSX,
 * con la tabla de franjas y una fórmula alternativa mezcladas entre las celdas.
 */

interface EstadoDeCierre {
  generalComments: string;
  sugerencias?: string;
  compromisos?: string;
  selectedLevels: Record<string, string>;
  respuestasEjeItem?: Record<string, number>;
  evidenciaUrls?: Record<string, string>;
}

export const SugerenciasYCompromisos = ({ estado }: { estado: EstadoDeCierre }) => (
  <div className="space-y-3 mt-6 break-inside-avoid">
    <div className="pdf-major-title">III. SUGERENCIAS Y COMPROMISOS</div>

    {estado.generalComments && (
      <div className="pdf-block">
        <h3 className="font-bold text-sm mb-2 text-slate-800">Observaciones Generales</h3>
        <p className="text-xs text-slate-700 whitespace-pre-wrap">{estado.generalComments}</p>
      </div>
    )}

    <div className="grid grid-cols-2 gap-4">
      <div className="pdf-block">
        <h3 className="font-bold text-sm mb-2 text-slate-800">Sugerencias del Especialista</h3>
        <p className="text-xs text-slate-700 whitespace-pre-wrap">
          {estado.sugerencias || 'No se registraron sugerencias.'}
        </p>
      </div>
      <div className="pdf-block">
        <h3 className="font-bold text-sm mb-2 text-slate-800">Compromisos del Evaluado</h3>
        <p className="text-xs text-slate-700 whitespace-pre-wrap">
          {estado.compromisos || 'No se registraron compromisos.'}
        </p>
      </div>
    </div>
  </div>
);

export const Consolidado = ({
  template,
  estado,
}: {
  template: Plantilla;
  estado: EstadoDeCierre;
}) => {
  const resultado = consolidarFicha(template.desempenos, estado.selectedLevels);

  // Planificación y diseño de evaluación existe sólo en el instrumento docente:
  // una plantilla directiva con ítems cargados agregaría columnas al
  // consolidado impreso que su ficha no lleva.
  const esDirectivo = template.tipoMonitoreo.toUpperCase().includes('DIRECTIVO');
  const ejes = esDirectivo ? [] : (template.ejesItems ?? []);
  const columnas = template.desempenos.length + ejes.length;

  return (
    <div className="mt-8 break-inside-avoid">
      <TituloDeSeccion>CONSOLIDADO DE NIVELES DE LOGRO:</TituloDeSeccion>
      <table className="pdf-table" style={{ marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td className="bg-gray text-center w-32">ASPECTOS</td>
            {template.desempenos.map((d, i) => (
              <td key={d.id} className="bg-gray text-center w-12">
                D{i + 1}
              </td>
            ))}
            {ejes.map((e, i) => (
              <td key={e.id} className="bg-gray text-center w-12">
                R{template.desempenos.length + i + 1}
              </td>
            ))}
          </tr>
          <tr>
            <td className="bg-gray text-center">PUNTAJE</td>
            {template.desempenos.map((d) => (
              <td key={`p-${d.id}`} className="text-center font-bold">
                {puntajeDeDesempeno(estado.selectedLevels[d.id]) ?? ''}
              </td>
            ))}
            {ejes.map((e) => (
              <td key={`p-${e.id}`} className="text-center font-bold">
                {estado.respuestasEjeItem?.[e.id] || ''}
              </td>
            ))}
          </tr>
          <tr>
            <td className="bg-gray text-center">TOTAL</td>
            <td colSpan={columnas} className="text-center font-bold text-sm">
              {resultado.puntaje > 0 ? resultado.puntaje : ''}
            </td>
          </tr>
          <tr>
            <td className="bg-gray text-center">NIVEL DE LOGRO</td>
            <td colSpan={columnas} className="text-center font-bold text-sm">
              {/* Antes lo no calificado valía 0 y bajaba el total por debajo de
                  la escala: ninguna franja lo alcanzaba y esta celda salía en
                  blanco, sin decir por qué. */}
              {resultado.nivel ?? (
                <span className="font-semibold italic text-slate-600">
                  Pendiente: {resultado.sinCalificar} de {template.desempenos.length} desempeños sin
                  calificar
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

/** Slots de evidencia general de la visita, en el orden en que se cargaron. */
export const Evidencias = ({ estado }: { estado: EstadoDeCierre }) => {
  const evidencias = Object.entries(estado.evidenciaUrls ?? {})
    .filter(([clave, url]) => clave.startsWith('GENERAL') && !!url)
    .sort(([a], [b]) => a.localeCompare(b));

  if (evidencias.length === 0) return null;

  return (
    <div className="mt-8">
      <TituloDeSeccion>EVIDENCIAS DEL MONITOREO:</TituloDeSeccion>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {evidencias.map(([clave, url], indice) => (
          <figure key={clave} className="break-inside-avoid border border-[#334155] p-1.5 text-center">
            <img
              src={url}
              alt={`Evidencia ${indice + 1}`}
              className="w-full object-contain mx-auto"
              style={{ maxHeight: '230px' }}
            />
            <figcaption className="text-[9px] font-semibold text-slate-600 mt-1">
              Evidencia {indice + 1}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
};

/** Carga y muestra la imagen de firma desde su URL autenticada. */
const FirmaImagen = ({ url }: { url: string | null | undefined }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let objectUrl: string | null = null;
    requestBlob(url)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        // Si falla (p.ej. URL directa), intentar usar la URL tal cual
        setBlobUrl(url);
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!blobUrl) return <div style={{ height: '40px' }} />;

  return (
    <img
      src={blobUrl}
      alt="Firma"
      style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain', margin: '0 auto 4px' }}
    />
  );
};

export const Firmas = ({
  visita,
  directorNombre,
}: {
  visita: Cronograma;
  directorNombre: string;
}) => {
  // El ID que se usa puede ser el de la ficha (BackendReportVisit.id) o el cronogramaId
  const fichaId = visita.id;
  const { data } = useQuery({
    queryKey: ['ficha-firmas', fichaId],
    queryFn: () => firmasApi.getFirmasDeFicha(fichaId),
    enabled: !!fichaId,
    staleTime: 30_000,
  });

  const firmaMap = new Map(
    (data?.firmas ?? []).map((f) => [f.rolFirmante.toUpperCase(), f.imagenUrl]),
  );

  return (
    <div className="mt-14 pt-6 break-inside-avoid">
      <div className="flex justify-between items-end gap-4 px-4">
        <Firma
          titulo="Firma del Especialista Monitor"
          nombre={visita.especialista}
          pie="AGP - UGEL Lampa"
          imagenUrl={firmaMap.get('EVALUADOR')}
        />
        <Firma
          titulo="Firma del Evaluado(a)"
          nombre={visita.docenteDirectivo}
          pie="Docente / Directivo"
          imagenUrl={firmaMap.get('EVALUADO')}
        />
        {visita.tipo === 'DOCENTE' && (
          <Firma
            titulo="Firma del Director(a) IE"
            nombre={directorNombre}
            pie="Sello / V°B° Institucional"
            imagenUrl={firmaMap.get('DIRECTOR')}
          />
        )}
      </div>
    </div>
  );
};

const Firma = ({
  titulo,
  nombre,
  pie,
  imagenUrl,
}: {
  titulo: string;
  nombre: string;
  pie: string;
  imagenUrl?: string | null;
}) => (
  <div className="text-center flex-1">
    <FirmaImagen url={imagenUrl} />
    <div className="border-b border-slate-600 mb-2 w-3/4 mx-auto" />
    <p className="font-extrabold text-[11px] text-slate-800">{titulo}</p>
    <p className="text-[9.5px] text-slate-600 font-medium">{nombre}</p>
    <p className="text-[8.5px] text-slate-400">{pie}</p>
  </div>
);

export const PieDeDocumento = ({ visitaId }: { visitaId: string }) => (
  <div className="mt-10 pt-3 text-center text-[8.5px] text-slate-500 border-t border-slate-300 flex justify-between items-center px-2">
    <span>Documento Oficial Generado por el Sistema de Monitoreo Pedagógico - UGEL LAMPA</span>
    <span className="font-mono text-[8px] text-slate-400">
      REG: {visitaId.slice(0, 8).toUpperCase()} | Impreso el{' '}
      {formatearFechaCorta(new Date().toISOString())}
    </span>
  </div>
);


