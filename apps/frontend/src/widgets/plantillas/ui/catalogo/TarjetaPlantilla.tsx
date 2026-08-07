import { Eye, Calendar, List, BarChart3 } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { formatearFechaAbreviada } from '@shared/lib/fecha/fecha';
import type { Plantilla } from '@entities/model-plantillas';
import { esDeUgel } from '@features/plantillas/lib/visibilidad-plantillas';
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

  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 hover:shadow-md transition-all duration-300 flex flex-col gap-5 group relative h-full">
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
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
          </div>
          <Badge
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border shadow-sm ${
              CLASE_ESTADO[plantilla.estado] ?? CLASE_ESTADO.Historico
            }`}
          >
            {plantilla.estado}
          </Badge>
        </div>

        <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-snug group-hover:text-primary transition-colors">
          {plantilla.tipoMonitoreo} {plantilla.anioAcademico}
        </h3>

        <div className="inline-flex">
          <span className="text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded border bg-primary-light border-primary/10 text-primary">
            {esDocente ? 'Ficha Docente' : 'Ficha Directiva'}
          </span>
        </div>

        <p className="text-xs text-text-muted leading-relaxed line-clamp-3 pt-1">
          {plantilla.descripcion}
        </p>
      </div>

      <div className="border-t border-slate-100 pt-3.5 space-y-2 text-[11px] text-slate-500 font-semibold">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>Registrada:</span>
          </span>
          <span className="text-slate-800">
            {formatearFechaAbreviada(plantilla.fechaCreacion, '—')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <List className="h-3.5 w-3.5 text-primary" />
            <span>Desempeños / Criterios:</span>
          </span>
          <span className="text-slate-800 font-bold">{plantilla.desempenos.length} evaluados</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span>Calificación:</span>
          </span>
          <span className="text-slate-800">
            Baremo {plantilla.baremo} ({plantilla.baremo === 'Vigente' ? '0-20' : '%'})
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
