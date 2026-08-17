import { forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Cronograma } from '@entities/model-cronogramas';
import type { Plantilla } from '@entities/model-plantillas';
import { useCronogramasData } from '@features/cronogramas/hooks/use-cronogramas-data';
import { fichasApi } from '@features/monitoreos/api/fichas.api';
import { formatearFechaEnPalabras, formatearHora } from '@shared/lib/fecha/fecha';
import { participantesDeLaFicha } from '@features/reportes/lib/participantes-de-ficha';
import { ESTILOS_DE_IMPRESION } from './ficha/estilos-de-impresion';
import { EncabezadoOficial } from './ficha/EncabezadoOficial';
import { DatosDeLaVisita } from './ficha/DatosDeLaVisita';
import { DesempenosEvaluados, EjesEItems } from './ficha/DesempenosEvaluados';
import {
  Consolidado,
  Evidencias,
  Firmas,
  PieDeDocumento,
  SugerenciasYCompromisos,
} from './ficha/CierreDeLaFicha';
import { TablaDeFicha, Rotulo, TituloDeSeccion } from './ficha/tabla';
import { useCan } from '@shared/auth';
import { Capability } from '@sistema-monitoreo/shared-contracts';

/**
 * La ficha de monitoreo tal como se imprime.
 *
 * Eran 764 líneas: noventa de hoja de estilos, la resolución de los cuatro
 * participantes, dos tablas de datos casi iguales, los desempeños, los ejes, el
 * consolidado con su tabla de franjas y las firmas, todo en un mismo archivo.
 */

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

export const FichaPrintable = forwardRef<HTMLDivElement, FichaPrintableProps>(
  ({ visit, template, fichaState }, ref) => {
    const { can } = useCan();
    const { docentes, especialistas, instituciones } = useCronogramasData(can(Capability.MONITOREO_READ));

    // La hora de cierre sólo existe en la ficha finalizada del backend.
    const { data: fichaDelBackend } = useQuery({
      queryKey: ['ficha-completada', visit.id],
      queryFn: () =>
        'nivelLogro' in visit ? fichasApi.findById(visit.id) : fichasApi.findByVisita(visit.id),
      enabled: !!visit.id && visit.estado === 'COMPLETADO',
    });

    const { docente, especialista, institucion, director } = participantesDeLaFicha(visit, {
      docentes,
      especialistas,
      instituciones,
    });

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans text-[11px] leading-snug w-full">
        <EncabezadoOficial
          anioAcademico={template.anioAcademico}
          lema={template.lema}
          esDirectivo={visit.tipo === 'DIRECTIVO'}
        />

        <style>{ESTILOS_DE_IMPRESION}</style>

        <DatosDeLaVisita
          visita={visit}
          contexto={fichaState.contexto}
          docente={docente}
          especialista={especialista}
          institucion={institucion}
          director={director}
        />

        <TituloDeSeccion>FECHA Y DURACIÓN:</TituloDeSeccion>
        <TablaDeFicha columnas={6} style={{ marginBottom: '20px' }}>
          <tr>
            <Rotulo>FECHA:</Rotulo>
            <td>{formatearFechaEnPalabras(visit.fechaHora)}</td>
            <Rotulo>HORA INICIO:</Rotulo>
            <td>{formatearHora(visit.fechaHora, '')}</td>
            <Rotulo>HORA FINAL:</Rotulo>
            <td>{formatearHora(fichaDelBackend?.finalizadaAt, '')}</td>
          </tr>
        </TablaDeFicha>

        <DesempenosEvaluados desempenos={template.desempenos} estado={fichaState} />

        {/* Sólo el instrumento docente lleva planificación y diseño de
            evaluación. Se condiciona al tipo y no sólo a que haya ítems. */}
        {visit.tipo !== 'DIRECTIVO' && !!template.ejesItems?.length && (
          <EjesEItems items={template.ejesItems} estado={fichaState} />
        )}

        <SugerenciasYCompromisos estado={fichaState} />
        <Consolidado template={template} estado={fichaState} />
        <Evidencias estado={fichaState} />

        <Firmas
          visita={visit}
          directorNombre={director.nombre || 'Director Institución'}
          plantillaId={template.id}
        />
        <PieDeDocumento visitaId={visit.id} />
      </div>
    );
  },
);

FichaPrintable.displayName = 'FichaPrintable';
