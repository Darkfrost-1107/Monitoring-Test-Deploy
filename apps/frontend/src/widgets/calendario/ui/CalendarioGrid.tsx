import { useMemo } from 'react';
import type { Cronograma } from '@/entities/model-cronogramas';
import { useUser } from '@/entities/model-user';
import { useScope } from '@shared/auth';
import {
  claveDeHoy,
  construirCuadriculaMensual,
  construirSemana,
  formatearFechaClave,
} from '@shared/lib/calendario/grid';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import {
  desplazarPeriodo,
  etiquetaDePeriodo,
  sincronizaDiaSeleccionado,
  type VistaCalendario,
} from '../model/navegacion';
import type { EstadoFiltrosCalendario } from '../model/use-filtros-calendario';
import { PanelFiltros, type OpcionesDeFiltro } from './grid/PanelFiltros';
import { CabeceraNavegacion } from './grid/CabeceraNavegacion';
import { VistaMensual } from './grid/VistaMensual';
import { VistaSemanal } from './grid/VistaSemanal';
import { VistaDiaria } from './grid/VistaDiaria';
import { VistaAnual } from './grid/VistaAnual';
import { VistaLista } from './grid/VistaLista';

/** Período visible y vista activa. */
export interface NavegacionCalendario {
  fecha: Date;
  onFecha: (fecha: Date) => void;
  vista: VistaCalendario;
  onVista: (vista: VistaCalendario) => void;
}

/** Qué día y qué visita está mirando el usuario. */
export interface SeleccionCalendario {
  fecha: string;
  onFecha: (fecha: string) => void;
  visitaId: string | null;
  onVisitaId: (id: string | null) => void;
  /** Abre el panel de detalle al elegir un día o una visita. */
  onAbrirDetalle: () => void;
}

interface CalendarioGridProps {
  visitas: Cronograma[];
  navegacion: NavegacionCalendario;
  seleccion: SeleccionCalendario;
  filtros: EstadoFiltrosCalendario;
  opcionesDeFiltro: OpcionesDeFiltro;
  /** Ensancha el área de contenido cuando el panel de detalle está cerrado. */
  detalleVisible: boolean;
}

/**
 * Calendario de visitas de monitoreo, en cinco vistas.
 *
 * Contenedor: resuelve las cuadrículas y coordina la selección; cada vista es
 * un componente de `./grid` que sólo pinta. Los filtros y la aritmética de
 * períodos viven en `../model`, con cobertura propia.
 *
 * Fase 5 de PLAN_REMEDIACION.md, hallazgos H-13 y H-14. La interfaz anterior
 * declaraba 29 propiedades, doce de ellas pares valor/setter de filtros
 * trasladados desde el padre.
 */
export const CalendarioGrid = ({
  visitas,
  navegacion,
  seleccion,
  filtros,
  opcionesDeFiltro,
  detalleVisible,
}: CalendarioGridProps) => {
  const { user } = useUser();
  // `isEspecialista` incluía también al coordinador pedagógico y al jefe de
  // taller: quienes levantan la ficha en el aula, no un cargo concreto.
  const { isMonitorCampo } = useScope();
  const esDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;

  const { fecha, onFecha, vista, onVista } = navegacion;
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();

  // Las tres construcciones viven en `shared/lib/calendario`: son aritmética de
  // fechas sin dependencia de React, y allí sí pueden probarse.
  const celdasDelMes = useMemo(() => construirCuadriculaMensual(anio, mes), [anio, mes]);
  const diasDeLaSemana = useMemo(() => construirSemana(fecha), [fecha]);
  const hoy = useMemo(() => claveDeHoy(), []);

  const visitasOrdenadas = useMemo(
    () => [...visitas].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
    [visitas],
  );

  const visitasDelDiaSeleccionado = useMemo(
    () => visitas.filter((v) => v.fechaHora.substring(0, 10) === seleccion.fecha),
    [visitas, seleccion.fecha],
  );

  /** Al cambiar de día, la selección salta a su primera visita, o a ninguna. */
  const seleccionarDia = (fechaStr: string) => {
    seleccion.onFecha(fechaStr);
    const delDia = visitas.filter((v) => v.fechaHora.substring(0, 10) === fechaStr);
    seleccion.onVisitaId(delDia[0]?.id ?? null);
  };

  const seleccionarDiaYAbrirDetalle = (fechaStr: string) => {
    seleccionarDia(fechaStr);
    seleccion.onAbrirDetalle();
  };

  const seleccionarVisita = (visitaId: string, fechaStr: string) => {
    seleccion.onFecha(fechaStr);
    seleccion.onVisitaId(visitaId);
    seleccion.onAbrirDetalle();
  };

  /**
   * En la vista diaria el período visible *es* un día, de modo que navegar debe
   * arrastrar también la selección; en las demás vistas el día se elige aparte.
   */
  const navegar = (paso: 1 | -1) => {
    const destino = desplazarPeriodo(fecha, vista, paso);
    if (sincronizaDiaSeleccionado(vista)) {
      seleccionarDia(formatearFechaClave(destino.getFullYear(), destino.getMonth(), destino.getDate()));
    }
    onFecha(destino);
  };

  const irAHoy = () => {
    const ahora = new Date();
    onFecha(ahora);
    seleccionarDia(formatearFechaClave(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
  };

  const abrirMes = (mesDestino: number, dia = 1) => {
    // Mediodía: evita que un cambio de horario de verano desplace el día.
    onFecha(new Date(anio, mesDestino, dia, 12));
    onVista('MENSUAL');
  };

  return (
    <div className="space-y-6">
      <PanelFiltros
        filtros={filtros}
        opciones={opcionesDeFiltro}
        perfil={esDirector ? 'director' : 'ugel'}
        especialistaFijo={
          isMonitorCampo && user ? `${user.nombres} ${user.apellidos}` : undefined
        }
      />

      <CabeceraNavegacion
        etiqueta={etiquetaDePeriodo(fecha, vista)}
        onAnterior={() => navegar(-1)}
        onSiguiente={() => navegar(1)}
        onHoy={irAHoy}
      />

      <div
        className={`${detalleVisible ? 'lg:col-span-8' : 'lg:col-span-12'} bg-surface border border-border rounded-xl p-5 shadow-sm transition-all duration-300`}
      >
        {vista === 'MENSUAL' && (
          <VistaMensual
            celdas={celdasDelMes}
            visitas={visitas}
            fechaSeleccionada={seleccion.fecha}
            hoy={hoy}
            onSeleccionarDia={seleccionarDiaYAbrirDetalle}
            onSeleccionarVisita={seleccionarVisita}
          />
        )}

        {vista === 'SEMANAL' && (
          <VistaSemanal
            dias={diasDeLaSemana}
            visitas={visitas}
            fechaSeleccionada={seleccion.fecha}
            visitaSeleccionadaId={seleccion.visitaId}
            hoy={hoy}
            onSeleccionarDia={seleccionarDiaYAbrirDetalle}
            onSeleccionarVisita={seleccionarVisita}
          />
        )}

        {vista === 'DIARIO' && (
          <VistaDiaria
            visitas={visitasDelDiaSeleccionado}
            fechaSeleccionada={seleccion.fecha}
            visitaSeleccionadaId={seleccion.visitaId}
            onSeleccionarVisita={seleccionarVisita}
          />
        )}

        {vista === 'ANUAL' && (
          <VistaAnual
            anio={anio}
            visitas={visitas}
            onAbrirMes={abrirMes}
            onSeleccionarDia={(fechaStr, visitaId) => {
              seleccion.onFecha(fechaStr);
              if (visitaId) seleccion.onVisitaId(visitaId);
            }}
          />
        )}

        {vista === 'LISTA' && (
          <VistaLista
            visitas={visitasOrdenadas}
            visitaSeleccionadaId={seleccion.visitaId}
            hayFiltroActivo={filtros.hayActivo}
            onSeleccionarVisita={seleccionarVisita}
            onLimpiarFiltros={filtros.limpiar}
          />
        )}
      </div>
    </div>
  );
};
