import { Eye, Calendar, List, BarChart3, UserRound, PencilLine, History } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { formatearFechaAbreviada } from '@shared/lib/fecha/fecha';
import { nombreDePlantilla, type Plantilla } from '@entities/model-plantillas';
import { esDeUgel } from '@features/plantillas/lib/visibilidad-plantillas';
import { etiquetaDeAutor } from '@features/plantillas/lib/autor-de-plantilla';
import { AccionesPlantilla } from './AccionesPlantilla';

/**
 * Una plantilla del catálogo.
 *
 * Fase 7 de PLAN_REMEDIACION.md. Eran ciento ochenta líneas dentro del `map` de
 * `PlantillasCatalog`, mezcladas con el cálculo de permisos.
 */

const CLASE_ESTADO: Record<string, string> = {
  Vigente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Borrador: 'bg-blue-50 text-blue-700 border-blue-200',
  Historico: 'bg-slate-100 text-slate-500 border-slate-200',
};

interface TarjetaPlantillaProps {
  plantilla: Plantilla;
  puedeCopiarParaSuIE: boolean;
  puedeGestionar: boolean;
  puedeClonarLaDelDirector: boolean;
  clonando: boolean;
  cambiandoEstado: boolean;
  onVerEstructura: () => void;
  onEditar: () => void;
  onClonar: () => void;
  onCambiarEstado: () => void;
  onEliminar: () => void;
}

export const TarjetaPlantilla = ({
  plantilla,
  onVerEstructura,
  ...acciones
}: TarjetaPlantillaProps) => {
  const esDocente = plantilla.tipoMonitoreo === 'Monitoreo Docente';
  const deUgel = esDeUgel(plantilla);
  const origen = deUgel ? 'UGEL' : plantilla.institucionNombre || 'Mi I.E.';
  // En las de la UGEL el cargo repetiría la insignia de origen.
  const cargoDelAutor = deUgel ? null : etiquetaDeAutor(plantilla.creadoPorRole);
  const fueEditada =
    !!plantilla.fechaActualizacion && plantilla.fechaActualizacion !== plantilla.fechaCreacion;

  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex flex-col gap-5 group relative h-full">
      <div className="space-y-2">
        <div className="flex items-start justify-between flex-wrap gap-2">
          {/* Envuelve: «Coordinador Pedagógico» junto al nombre de la institución
              no entra en una sola línea en la grilla de tres columnas. */}
          <div className="flex items-center flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] font-bold px-2 py-0.5 border-slate-200 text-slate-600 bg-slate-50"
            >
              Año {plantilla.anioAcademico}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[9px] font-bold px-2 py-0.5 border shadow-sm line-clamp-1 break-all max-w-[180px] leading-tight ${
                deUgel
                  ? 'bg-slate-50 text-slate-600 border-slate-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
              title={origen}
            >
              {origen}
            </Badge>
            {cargoDelAutor && (
              <Badge
                variant="outline"
                className="text-[9px] font-bold px-2 py-0.5 border shadow-sm leading-tight bg-amber-50 text-amber-700 border-amber-200"
                title={`Plantilla del ${cargoDelAutor}`}
              >
                {cargoDelAutor}
              </Badge>
            )}
          </div>
          <Badge
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border shadow-sm ${
              CLASE_ESTADO[plantilla.estado] ?? CLASE_ESTADO.Historico
            }`}
          >
            {plantilla.estado}
          </Badge>
        </div>

        {/*
          El nombre que puso quien la creó manda sobre el rótulo automático.
          Sin él, todas las fichas del mismo instrumento y año se titulaban
          igual —«Monitoreo Docente 2026»— y sólo se distinguían por la insignia
          del autor: cuatro tarjetas idénticas en el catálogo de una I.E.
        */}
        <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-snug group-hover:text-primary transition-colors">
          {nombreDePlantilla(plantilla)}
        </h3>

        <div className="inline-flex">
          <span className="text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded border bg-primary-light border-primary/10 text-primary">
            {plantilla.instrumento === 'DOCENTE_EIB'
              ? 'Ficha Docente EIB'
              : esDocente
                ? 'Ficha Docente'
                : 'Ficha Directiva'}
          </span>
        </div>

        {/* La descripción no se dibuja: la fabricaba el formulario con la fecha
            y la cantidad de desempeños, dos datos que ya están abajo, y en las
            copias repetía el «Copia basada en …» del clonado. El campo sigue en
            la base para las plantillas que ya lo traían. */}
      </div>

      <div className="border-t border-slate-100 pt-3.5 space-y-2 text-[11px] text-slate-500 font-semibold">
        {plantilla.autorNombre && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 shrink-0">
              <UserRound className="h-3.5 w-3.5 text-primary" />
              <span>Autor:</span>
            </span>
            <span
              className="text-slate-800 text-right line-clamp-1 break-all"
              title={plantilla.autorNombre}
            >
              {plantilla.autorNombre}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Registrada:</span>
          </span>
          <span className="text-slate-800">
            {formatearFechaAbreviada(plantilla.fechaCreacion, '—')}
          </span>
        </div>

        {/* Sólo cuando difiere del registro: una plantilla que nunca se tocó
            mostraría la misma fecha dos veces. Es el único rastro de las
            ediciones in-place, que no suben la versión. */}
        {fueEditada && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <PencilLine className="h-3.5 w-3.5 text-primary" />
              <span>Actualizada:</span>
            </span>
            <span className="text-slate-800">
              {formatearFechaAbreviada(plantilla.fechaActualizacion, '—')}
            </span>
          </div>
        )}

        {/* La versión sube cuando la edición tuvo que versionar por tener fichas
            asociadas. En la v1 no dice nada que no se sepa. */}
        {plantilla.version > 1 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <History className="h-3.5 w-3.5 text-primary" />
              <span>Versión:</span>
            </span>
            <span className="text-slate-800 font-bold">v{plantilla.version}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <List className="h-3.5 w-3.5 text-primary" />
            <span>{plantilla.instrumento === 'DOCENTE_EIB' ? 'Ítems Observables:' : 'Desempeños / Criterios:'}</span>
          </span>
          <span className="text-slate-800 font-bold">
            {plantilla.instrumento === 'DOCENTE_EIB'
              ? `${plantilla.desempenos.length} ítems EIB`
              : `${plantilla.desempenos.length} evaluados`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span>Calificación:</span>
          </span>
          <span className="text-slate-800">
            {plantilla.instrumento === 'DOCENTE_EIB'
              ? 'Cualitativa (Sí / Parcial / No)'
              : `Baremo ${plantilla.baremo} (${plantilla.baremo === 'Vigente' ? '0-20' : '%'})`}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Button
          onClick={onVerEstructura}
          className="w-full justify-center bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Eye className="h-4 w-4" />
          <span>Ver Estructura</span>
        </Button>

        <AccionesPlantilla plantilla={plantilla} {...acciones} />
      </div>
    </Card>
  );
};
