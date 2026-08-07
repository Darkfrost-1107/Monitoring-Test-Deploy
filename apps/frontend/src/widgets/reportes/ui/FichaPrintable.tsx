import { forwardRef } from 'react';
import type { Cronograma } from '@/entities/model-cronogramas';
import type { Plantilla } from '@/entities/model-plantillas';
import { useCronogramasData } from '@/features/cronogramas/hooks/use-cronogramas-data';
import { useQuery } from '@tanstack/react-query';
import { fichasApi } from '@/features/monitoreos/api/fichas.api';
import {
  formatearFechaCorta,
  formatearFechaEnPalabras,
  formatearHora,
} from '@shared/lib/fecha/fecha';

interface FichaPrintableProps {
  visit: Cronograma;
  template: Plantilla;
  fichaState: {
    checkedAspects: Record<string, boolean>;
    selectedLevels: Record<string, string>;
    generalComments: string;
    sugerencias?: string;
    compromisos?: string;
    rubricComments?: Record<string, string>;
    preguntaExtraAnswers?: Record<string, boolean>;
    respuestasEjeItem?: Record<string, number>;
    evidenciaUrls?: Record<string, string>;
    observacionesEjeItem?: Record<string, string>;
    contexto?: {
      areaCurricular: string;
      grado: string;
      seccion: string;
      cantidadEstudiantes: number;
      cantidadEstudiantesNee: number;
    };
  };
}


const getLevelStyle = (level: string) => {
  switch (level) {
    case 'I':
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    case 'II':
      return { backgroundColor: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74' };
    case 'III':
      return { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
    case 'IV':
      return { backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' };
    default:
      return { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
  }
};

export const FichaPrintable = forwardRef<HTMLDivElement, FichaPrintableProps>(
  ({ visit, template, fichaState }, ref) => {
    const { docentes, especialistas, instituciones } = useCronogramasData();

    // Fetch Completed Ficha if available to get finalizadaAt
    const { data: backendFicha } = useQuery({
      queryKey: ['ficha-completada', visit.id],
      queryFn: () => {
        const hasBackendData = 'nivelLogro' in visit;
        return hasBackendData
          ? fichasApi.findById(visit.id)
          : fichasApi.findByVisita(visit.id);
      },
      enabled: !!visit.id && visit.estado === 'COMPLETADO',
    });

    // Match Docente
    const doc = docentes?.find((d) => d.id === visit.evaluadoId) ||
                docentes?.find((d) => `${d.nombres} ${d.apellidos}`.toLowerCase() === visit.docenteDirectivo?.toLowerCase());

    // Match Especialista (Monitor)
    const esp = especialistas?.find((e) => e.id === visit.monitorId) ||
                especialistas?.find((e) => e.nombre.toLowerCase() === visit.especialista?.toLowerCase());

    // Match Institucion
    const inst = instituciones?.find((i) => i.id === visit.institucionId) ||
                 instituciones?.find((i) => i.nombre.toLowerCase() === visit.institucion?.toLowerCase());

    // Match Director
    const dirDocente = docentes?.find((d) => d.institucionId === visit.institucionId && d.cargo === 'Director') ||
                       (inst?.director ? docentes?.find((d) => `${d.nombres} ${d.apellidos}`.toLowerCase() === inst.director?.toLowerCase()) : undefined);

    const directorNombre = visit.tipo === 'DIRECTIVO'
      ? visit.docenteDirectivo
      : (dirDocente ? `${dirDocente.nombres} ${dirDocente.apellidos}` : inst?.director || '');

    const directorDni = visit.tipo === 'DIRECTIVO'
      ? (doc?.dni || '')
      : (dirDocente?.dni || inst?.directorDni || '');

    const directorCorreo = visit.tipo === 'DIRECTIVO'
      ? (doc?.correo || '')
      : (dirDocente?.correo || inst?.directorCorreo || '');

    const directorCelular = visit.tipo === 'DIRECTIVO'
      ? (doc?.celular || '')
      : (dirDocente?.celular || inst?.directorTelefono || '');

    const directorCondicion = visit.tipo === 'DIRECTIVO'
      ? (doc?.condicion || '')
      : (dirDocente?.condicion || '');

    // Get Hora Final
    const horaFinalVal = backendFicha?.finalizadaAt
      ? formatearHora(backendFicha.finalizadaAt)
      : '';

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans text-[11px] leading-snug w-full">
        {/* Encabezado Institucional Oficial */}
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
          <div className="text-center italic text-[9px] text-slate-600 pt-1 border-t border-slate-200">
            "Año de la recuperación y consolidación de la economía peruana"
          </div>
        </div>

        <div className="pdf-doc-title">
          {visit.tipo === 'DIRECTIVO'
            ? `FICHA DE MONITOREO Y ACOMPAÑAMIENTO AL DIRECTOR(A) DE I.E. - ${template.anioAcademico}`
            : `FICHA DE MONITOREO Y ACOMPAÑAMIENTO AL DESEMPEÑO DOCENTE - ${template.anioAcademico}`}
        </div>

        <style>{`
          @page {
            size: A4 portrait;
            margin: 14mm 15mm 16mm;
            @bottom-center {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 8px;
              color: #475569;
            }
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
          /* ── Paleta única de bordes/grises (aspecto formal, oficial) ── */
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 9.5px;
            table-layout: fixed;
          }
          .pdf-table td {
            border: 1px solid #334155;
            padding: 3.5px 5px;
            word-break: break-word;
            vertical-align: middle;
          }
          .pdf-table .bg-gray {
            background-color: #e2e8f0;
            font-weight: bold;
            color: #0f172a;
          }
          /* ── Jerarquía tipográfica en 3 niveles, mismo lenguaje visual ── */
          .pdf-doc-title {
            text-align: center;
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #0f172a;
            background-color: #e2e8f0;
            border: 1.5px solid #334155;
            padding: 5px 8px;
            margin-bottom: 12px;
          }
          .pdf-major-title {
            font-size: 11.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #ffffff;
            background-color: #334155;
            padding: 3px 8px;
            margin-top: 16px;
            margin-bottom: 8px;
          }
          .pdf-section-title {
            font-weight: 800;
            text-transform: uppercase;
            font-size: 10px;
            color: #0f172a;
            background-color: #e2e8f0;
            border: 1px solid #334155;
            padding: 2.5px 6px;
            margin-top: 10px;
            margin-bottom: 5px;
            letter-spacing: 0.03em;
          }
          /* Bloque formal (reemplaza las tarjetas redondeadas) */
          .pdf-block {
            border: 1px solid #334155;
            padding: 8px 10px;
          }
          /* Viñeta circular: hueca por defecto, rellena si el aspecto se cumplió */
          .pdf-bullet {
            display: inline-block;
            width: 8px;
            height: 8px;
            border: 1.2px solid #334155;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .pdf-bullet.checked {
            background-color: #334155;
          }
        `}</style>

        {visit.tipo === 'DIRECTIVO' ? (
          <>
            {/* DATOS DE LA INSTITUCIÓN EDUCATIVA */}
            <div className="pdf-section-title">DATOS DE LA INSTITUCIÓN EDUCATIVA:</div>
            <table className="pdf-table table-fixed w-full">
              <colgroup>
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bg-gray">UGEL:</td>
                  <td colSpan={5}>UGEL LAMPA</td>
                </tr>
                <tr>
                  <td className="bg-gray">INSTITUCIÓN EDUCATIVA:</td>
                  <td colSpan={3}>{visit.institucion}</td>
                  <td className="bg-gray">CÓD. MODULAR:</td>
                  <td>{inst?.codigoModular || ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">MODALIDAD:</td>
                  <td>{visit.modalidad || ''}</td>
                  <td className="bg-gray">NIVEL:</td>
                  <td>{visit.nivel || ''}</td>
                  <td className="bg-gray">ÁREA:</td>
                  <td>{fichaState.contexto?.areaCurricular || ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray" colSpan={2}>APELLIDOS Y NOMBRES DEL DIRECTOR(A):</td>
                  <td colSpan={4}>{directorNombre}</td>
                </tr>
                <tr>
                  <td className="bg-gray">DNI:</td>
                  <td>{directorDni}</td>
                  <td className="bg-gray">E-MAIL:</td>
                  <td>{directorCorreo}</td>
                  <td className="bg-gray">N° CELULAR:</td>
                  <td>{directorCelular}</td>
                </tr>
                <tr>
                  <td className="bg-gray">ENCARGADO:</td>
                  <td>{(directorCondicion === 'Encargado' || directorCondicion === 'Por Función') ? 'X' : ''}</td>
                  <td className="bg-gray">DESIGNADO:</td>
                  <td>{directorCondicion === 'Designado' ? 'X' : ''}</td>
                  <td className="bg-gray">NOMBRADO:</td>
                  <td>{directorCondicion === 'Nombrado' ? 'X' : ''}</td>
                </tr>
              </tbody>
            </table>

            {/* DATOS DEL MONITOR */}
            <div className="pdf-section-title">DATOS DEL MONITOR:</div>
            <table className="pdf-table table-fixed w-full">
              <colgroup>
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
                <col className="w-1/8" style={{ width: '12.5%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bg-gray" colSpan={3}>APELLIDOS Y NOMBRES MONITOR(A) DREP</td>
                  <td colSpan={5}>{esp?.cargo === 'DREP' ? esp.nombre : ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">DNI</td>
                  <td>{esp?.cargo === 'DREP' ? esp.dni : ''}</td>
                  <td className="bg-gray">CARGO</td>
                  <td>{esp?.cargo === 'DREP' ? esp.cargo : ''}</td>
                  <td className="bg-gray">E-MAIL</td>
                  <td>{esp?.cargo === 'DREP' ? esp.correo : ''}</td>
                  <td className="bg-gray">N° CELULAR</td>
                  <td>{esp?.cargo === 'DREP' ? esp.celular : ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray" colSpan={3}>APELLIDOS Y NOMBRES MONITOR(A) UGEL</td>
                  <td colSpan={5}>{esp?.cargo !== 'DREP' ? visit.especialista : ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">DNI</td>
                  <td>{esp?.cargo !== 'DREP' ? esp?.dni : ''}</td>
                  <td className="bg-gray">CARGO</td>
                  <td>{esp?.cargo !== 'DREP' ? esp?.cargo : ''}</td>
                  <td className="bg-gray">E-MAIL</td>
                  <td>{esp?.cargo !== 'DREP' ? esp?.correo : ''}</td>
                  <td className="bg-gray">N° CELULAR</td>
                  <td>{esp?.cargo !== 'DREP' ? esp?.celular : ''}</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            {/* DATOS DE LA INSTITUCIÓN EDUCATIVA (DOCENTE) */}
            <div className="pdf-section-title">DATOS DE LA INSTITUCIÓN EDUCATIVA:</div>
            <table className="pdf-table table-fixed w-full">
              <colgroup>
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bg-gray">UGEL:</td>
                  <td colSpan={5}>UGEL LAMPA</td>
                </tr>
                <tr>
                  <td className="bg-gray">INSTITUCIÓN EDUCATIVA:</td>
                  <td colSpan={5}>{visit.institucion}</td>
                </tr>
                <tr>
                  <td className="bg-gray">MODALIDAD:</td>
                  <td>{visit.modalidad || ''}</td>
                  <td className="bg-gray">NIVEL:</td>
                  <td>{visit.nivel || ''}</td>
                  <td className="bg-gray">ÁREA:</td>
                  <td>{fichaState.contexto?.areaCurricular || ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray" colSpan={2}>APELLIDOS Y NOMBRES DEL DIRECTOR(A):</td>
                  <td colSpan={4}>{directorNombre}</td>
                </tr>
                <tr>
                  <td className="bg-gray">DNI:</td>
                  <td>{directorDni}</td>
                  <td className="bg-gray">E-MAIL:</td>
                  <td>{directorCorreo}</td>
                  <td className="bg-gray">N° CELULAR:</td>
                  <td>{directorCelular}</td>
                </tr>
                <tr>
                  <td className="bg-gray">ENCARGADO:</td>
                  <td>{directorCondicion === 'Encargado' ? 'X' : ''}</td>
                  <td className="bg-gray">DESIGNADO:</td>
                  <td>{directorCondicion === 'Designado' ? 'X' : ''}</td>
                  <td className="bg-gray">ENC. X FUNCIONES:</td>
                  <td>{directorCondicion === 'Por Función' ? 'X' : ''}</td>
                </tr>
              </tbody>
            </table>

            {/* DATOS DEL DOCENTE MONITOREADO */}
            <div className="pdf-section-title">DATOS DEL DOCENTE MONITOREADO:</div>
            <table className="pdf-table table-fixed w-full">
              <colgroup>
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bg-gray" colSpan={2}>APELLIDOS Y NOMBRES DEL DOCENTE:</td>
                  <td colSpan={4}>{visit.docenteDirectivo}</td>
                </tr>
                <tr>
                  <td className="bg-gray">DNI:</td>
                  <td>{doc?.dni || ''}</td>
                  <td className="bg-gray">E-MAIL:</td>
                  <td>{doc?.correo || ''}</td>
                  <td className="bg-gray">N° CELULAR:</td>
                  <td>{doc?.celular || ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">CONTRATADO:</td>
                  <td>{doc?.condicion === 'Contratado' ? 'X' : ''}</td>
                  <td className="bg-gray">NOMBRADO:</td>
                  <td>{doc?.condicion === 'Nombrado' ? 'X' : ''}</td>
                  <td className="bg-gray">OTRO:</td>
                  <td>{doc?.condicion !== 'Nombrado' && doc?.condicion !== 'Contratado' && doc?.condicion ? 'X' : ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">MODALIDAD:</td>
                  <td>{visit.modalidad || ''}</td>
                  <td className="bg-gray">NIVEL:</td>
                  <td>{visit.nivel || ''}</td>
                  <td className="bg-gray">ÁREA:</td>
                  <td>{fichaState.contexto?.areaCurricular || ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">GRADO:</td>
                  <td>{fichaState.contexto?.grado || ''}</td>
                  <td className="bg-gray">SECCIÓN:</td>
                  <td>{fichaState.contexto?.seccion || ''}</td>
                  <td className="bg-gray">CANT. ESTUDIANTES:</td>
                  <td>{fichaState.contexto?.cantidadEstudiantes || ''}</td>
                </tr>
                <tr>
                  <td className="bg-gray">NEE:</td>
                  <td>{fichaState.contexto?.cantidadEstudiantesNee || ''}</td>
                  <td colSpan={4}></td>
                </tr>
              </tbody>
            </table>

            {/* DATOS DEL(OS) MONITOR(ES) */}
            <div className="pdf-section-title">DATOS DEL(OS) MONITOR(ES):</div>
            <table className="pdf-table table-fixed w-full">
              <colgroup>
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
                <col className="w-1/6" style={{ width: '16.666%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bg-gray" colSpan={1}>APELLIDOS Y NOMBRES:</td>
                  <td colSpan={5}>
                    <span className="mr-4">DREP ({esp?.cargo === 'DREP' ? 'X' : ' '})</span>
                    <span className="mr-4">UGEL ({esp?.cargo !== 'DREP' && esp?.cargo !== 'Director' && esp?.cargo !== 'Coordinador Pedagógico' && esp?.cargo !== 'Jefe de Taller' ? 'X' : ' '}) {visit.especialista}</span>
                    <span className="mr-4">DIRECTOR IE ({esp?.cargo === 'Director' ? 'X' : ' '})</span>
                    <span>COORDINADOR ({esp?.cargo === 'Coordinador Pedagógico' || esp?.cargo === 'Jefe de Taller' ? 'X' : ' '})</span>
                  </td>
                </tr>
                <tr>
                  <td className="bg-gray">DNI:</td>
                  <td>{esp?.dni || ''}</td>
                  <td className="bg-gray">E-MAIL:</td>
                  <td>{esp?.correo || ''}</td>
                  <td className="bg-gray">N° CELULAR:</td>
                  <td>{esp?.celular || ''}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* FECHA Y DURACIÓN */}
        <div className="pdf-section-title">FECHA Y DURACIÓN:</div>
        <table className="pdf-table table-fixed w-full" style={{ marginBottom: '20px' }}>
          <colgroup>
            <col className="w-1/6" style={{ width: '16.666%' }} />
            <col className="w-1/6" style={{ width: '16.666%' }} />
            <col className="w-1/6" style={{ width: '16.666%' }} />
            <col className="w-1/6" style={{ width: '16.666%' }} />
            <col className="w-1/6" style={{ width: '16.666%' }} />
            <col className="w-1/6" style={{ width: '16.666%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="bg-gray">FECHA:</td>
              <td>{formatearFechaEnPalabras(visit.fechaHora)}</td>
              <td className="bg-gray">HORA INICIO:</td>
              <td>{
                !isNaN(new Date(visit.fechaHora).getTime()) 
                  ? formatearHora(visit.fechaHora) 
                  : ''
              }</td>
              <td className="bg-gray">HORA FINAL:</td>
              <td>{horaFinalVal}</td>
            </tr>
          </tbody>
        </table>

        {/* Desempeños */}
        <div className="space-y-3">
          <div className="pdf-major-title">I. DESEMPEÑOS EVALUADOS</div>

          {template.desempenos.map((des, idx) => {
            const selectedLevelVal = fichaState.selectedLevels[des.id];
            const levelStyle = selectedLevelVal ? getLevelStyle(selectedLevelVal) : null;
            
            return (
              <div key={des.id} className="pdf-block break-inside-avoid">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="font-bold text-[12px]">
                    {idx + 1}. {des.nombre}
                  </h3>
                  {selectedLevelVal && levelStyle && (
                    <div className="shrink-0 px-2 py-0.5 font-bold text-[10px] border" style={{ backgroundColor: levelStyle.backgroundColor, color: levelStyle.color, borderColor: levelStyle.color }}>
                      Nivel {selectedLevelVal}
                    </div>
                  )}
                </div>
                
                <p className="text-slate-600 italic mb-3">{des.descripcionCorta}</p>

                {/* Aspectos Evaluados */}
                {des.aspectos && des.aspectos.length > 0 && (
                  <div className="mt-3 mb-3 text-[11px]">
                    <p className="font-bold text-slate-700 mb-1">Aspectos a Considerar:</p>
                    <div className="space-y-1 pl-2">
                      {des.aspectos.map((asp) => {
                        const isChecked = !!fichaState.checkedAspects[asp.id];
                        return (
                          <div key={asp.id} className="flex items-start gap-2 text-slate-800">
                            <span className={`pdf-bullet mt-[3px] ${isChecked ? 'checked' : ''}`} />
                            <span>{asp.descripcion}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Respuesta a Pregunta Extra */}
                {des.preguntaExtra && (
                  <div className="bg-slate-50 border border-slate-400 p-2 mb-3 text-xs">
                    <span className="font-bold">Pregunta:</span> {des.preguntaExtra} <br />
                    <span className="font-bold mt-1 inline-block">Respuesta:</span>{' '}
                    {fichaState.preguntaExtraAnswers?.[des.id] === true ? 'SÍ' : fichaState.preguntaExtraAnswers?.[des.id] === false ? 'NO' : 'Sin responder'}
                  </div>
                )}

                {/* Justificación del Nivel */}
                {selectedLevelVal && levelStyle && (
                  <div className="text-xs border-l-2 pl-3 mt-3" style={{ borderColor: levelStyle.color }}>
                    <p className="font-bold mb-1 text-slate-700">Justificación y Evidencias:</p>
                    <p className="text-slate-800 whitespace-pre-wrap">{fichaState.rubricComments?.[des.id] || 'Sin justificación registrada.'}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ejes e Items */}
        {template.ejesItems && template.ejesItems.length > 0 && (
          <div className="space-y-3 mt-6 break-before-auto">
            <div className="pdf-major-title">II. EJES E ITEMS</div>
            <table className="pdf-table" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <td className="bg-gray text-center" style={{ width: '5%' }}>N°</td>
                  <td className="bg-gray">Descripción</td>
                  <td className="bg-gray text-center" style={{ width: '12%' }}>Nivel</td>
                  <td className="bg-gray" style={{ width: '30%' }}>Observaciones</td>
                </tr>
              </thead>
              <tbody>
                {template.ejesItems.map((item) => {
                  const nivel = fichaState.respuestasEjeItem?.[item.id];
                  const levelRom = nivel ? ['', 'I', 'II', 'III', 'IV'][nivel] : null;
                  return (
                    <tr key={item.id}>
                      <td className="text-center font-bold">{item.numero}</td>
                      <td>{item.descripcion}</td>
                      <td className="text-center font-bold">
                        {levelRom ? `Nivel ${levelRom}` : '-'}
                      </td>
                      <td className="whitespace-pre-wrap">
                        {fichaState.observacionesEjeItem?.[item.id] || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sugerencias y Compromisos */}
        <div className="space-y-3 mt-6 break-inside-avoid">
          <div className="pdf-major-title">III. SUGERENCIAS Y COMPROMISOS</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="pdf-block">
              <h3 className="font-bold text-sm mb-2 text-slate-800">Sugerencias del Especialista</h3>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">
                {fichaState.sugerencias || 'No se registraron sugerencias.'}
              </p>
            </div>
            <div className="pdf-block">
              <h3 className="font-bold text-sm mb-2 text-slate-800">Compromisos del Evaluado</h3>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">
                {fichaState.compromisos || 'No se registraron compromisos.'}
              </p>
            </div>
          </div>
        </div>

        {/* Consolidado */}
        {(() => {
          const romanToNum = (r: string) => ({ I: 1, II: 2, III: 3, IV: 4 }[r as string] ?? 0);
          const numDesempenos = template.desempenos.length;
          const puntajeMax = numDesempenos * 4;
          const puntajeMin = numDesempenos * 1;
          const puntajeTotal = template.desempenos.reduce(
            (acc, d) => acc + romanToNum(fichaState.selectedLevels[d.id] || ''),
            0
          );
          
          let nivel = '';
          if (numDesempenos === 5) {
            if (puntajeTotal >= 5 && puntajeTotal <= 7) nivel = 'INICIO';
            else if (puntajeTotal >= 8 && puntajeTotal <= 12) nivel = 'EN PROCESO';
            else if (puntajeTotal >= 13 && puntajeTotal <= 17) nivel = 'LOGRO ESPERADO';
            else if (puntajeTotal >= 18) nivel = 'LOGRO DESTACADO';
          } else if (numDesempenos > 0) {
            if (puntajeTotal <= puntajeMin + Math.floor((puntajeMax - puntajeMin) * 0.25)) nivel = 'INICIO';
            else if (puntajeTotal <= puntajeMin + Math.floor((puntajeMax - puntajeMin) * 0.50)) nivel = 'EN PROCESO';
            else if (puntajeTotal <= puntajeMin + Math.floor((puntajeMax - puntajeMin) * 0.75)) nivel = 'LOGRO ESPERADO';
            else nivel = 'LOGRO DESTACADO';
          }

          return (
            <div className="mt-8 break-inside-avoid">
              <div className="pdf-section-title">CONSOLIDADO DE NIVELES DE LOGRO:</div>
              <table className="pdf-table" style={{ marginBottom: '20px' }}>
                <tbody>
                  <tr>
                    <td className="bg-gray text-center w-32">ASPECTOS</td>
                    {template.desempenos.map((d, i) => (
                      <td key={d.id} className="bg-gray text-center w-12">D{i + 1}</td>
                    ))}
                    {template.ejesItems?.map((e, i) => (
                      <td key={e.id} className="bg-gray text-center w-12">R{template.desempenos.length + i + 1}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="bg-gray text-center">PUNTAJE</td>
                    {template.desempenos.map((d) => (
                      <td key={`puntaje-${d.id}`} className="text-center font-bold">
                        {fichaState.selectedLevels[d.id] ? romanToNum(fichaState.selectedLevels[d.id]) : ''}
                      </td>
                    ))}
                    {template.ejesItems?.map((e) => (
                      <td key={`puntaje-${e.id}`} className="text-center font-bold">
                        {fichaState.respuestasEjeItem?.[e.id] || ''}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="bg-gray text-center">TOTAL</td>
                    <td colSpan={template.desempenos.length + (template.ejesItems?.length || 0)} className="text-center font-bold text-sm">
                      {puntajeTotal > 0 ? puntajeTotal : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-gray text-center">NIVEL DE LOGRO</td>
                    <td colSpan={template.desempenos.length + (template.ejesItems?.length || 0)} className="text-center font-bold text-sm">
                      {nivel}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* EVIDENCIAS DEL MONITOREO (slots GENERAL_1..3, más 'GENERAL' legado) */}
        {(() => {
          const evidencias = Object.entries(fichaState.evidenciaUrls ?? {})
            .filter(([k, url]) => k.startsWith('GENERAL') && !!url)
            .sort(([a], [b]) => a.localeCompare(b));
          if (evidencias.length === 0) return null;
          return (
            <div className="mt-8">
              <div className="pdf-section-title">EVIDENCIAS DEL MONITOREO:</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {evidencias.map(([key, url], idx) => (
                  <figure key={key} className="break-inside-avoid border border-[#334155] p-1.5 text-center">
                    <img
                      src={url}
                      alt={`Evidencia ${idx + 1}`}
                      className="w-full object-contain mx-auto"
                      style={{ maxHeight: '230px' }}
                    />
                    <figcaption className="text-[9px] font-semibold text-slate-600 mt-1">
                      Evidencia {idx + 1}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Firmas y Validación Institucional */}
        <div className="mt-14 pt-6 break-inside-avoid">
          <div className="flex justify-between items-end gap-4 px-4">
            <div className="text-center flex-1">
              <div className="border-b border-slate-600 mb-2 w-3/4 mx-auto"></div>
              <p className="font-extrabold text-[11px] text-slate-800">Firma del Especialista Monitor</p>
              <p className="text-[9.5px] text-slate-600 font-medium">{visit.especialista}</p>
              <p className="text-[8.5px] text-slate-400">AGP - UGEL Lampa</p>
            </div>
            <div className="text-center flex-1">
              <div className="border-b border-slate-600 mb-2 w-3/4 mx-auto"></div>
              <p className="font-extrabold text-[11px] text-slate-800">Firma del Evaluado(a)</p>
              <p className="text-[9.5px] text-slate-600 font-medium">{visit.docenteDirectivo}</p>
              <p className="text-[8.5px] text-slate-400">Docente / Directivo</p>
            </div>
            {visit.tipo === 'DOCENTE' && (
              <div className="text-center flex-1">
                <div className="border-b border-slate-600 mb-2 w-3/4 mx-auto"></div>
                <p className="font-extrabold text-[11px] text-slate-800">Firma del Director(a) IE</p>
                <p className="text-[9.5px] text-slate-600 font-medium">{directorNombre || 'Director Institución'}</p>
                <p className="text-[8.5px] text-slate-400">Sello / V°B° Institucional</p>
              </div>
            )}
          </div>
        </div>

        {/* Pie de Página Oficial con Registro */}
        <div className="mt-10 pt-3 text-center text-[8.5px] text-slate-500 border-t border-slate-300 flex justify-between items-center px-2">
          <span>Documento Oficial Generado por el Sistema de Monitoreo Pedagógico - UGEL LAMPA</span>
          <span className="font-mono text-[8px] text-slate-400">REG: {visit.id.slice(0, 8).toUpperCase()} | {formatearFechaCorta(new Date().toISOString())}</span>
        </div>
      </div>
    );
  }
);
FichaPrintable.displayName = 'FichaPrintable';
