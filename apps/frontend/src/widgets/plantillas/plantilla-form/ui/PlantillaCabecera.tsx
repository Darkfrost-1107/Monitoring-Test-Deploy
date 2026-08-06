import { Settings } from 'lucide-react';
import { SectionCard, SelectField, TextField } from '@shared/ui/form-controls';
import type { Baremo, NivelCalificacion } from '@entities/model-plantillas';
import { TIPOS_MONITOREO, BAREMOS } from '@entities/model-plantillas';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

interface Props {
  tipoMonitoreo: string;
  anioAcademico: number;
  baremo: Baremo;
  niveles: NivelCalificacion[];
  onChange: (patch: Partial<{
    tipoMonitoreo: string;
    anioAcademico: number;
    baremo: Baremo;
    niveles: NivelCalificacion[];
  }>) => void;
  isEditMode?: boolean;
}

export const PlantillaCabecera = ({
  tipoMonitoreo,
  anioAcademico,
  baremo,
  niveles,
  onChange,
  isEditMode = false,
}: Props) => {
  const { user } = useUser();
  const isDirector = user?.role === RoleCode.DIRECTOR_INSTITUCION;
  const setNivel = (i: number, p: Partial<NivelCalificacion>) =>
    onChange({ niveles: niveles.map((n, idx) => (idx === i ? { ...n, ...p } : n)) });

  return (
    <SectionCard
      icon={<Settings className="w-5 h-5" />}
      title="1. Información General de Cabecera"
      headerRight={
        <span className="text-[0.6rem] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
          Configuración Base
        </span>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campos */}
        <div className="flex flex-col gap-4">
          <SelectField
            label="Tipo de Monitoreo"
            required
            value={tipoMonitoreo}
            onChange={(v) => onChange({ tipoMonitoreo: v })}
            options={(isDirector ? ['Monitoreo Docente'] : TIPOS_MONITOREO).map((t) => ({ value: t, label: t }))}
            placeholder="Seleccione el tipo"
            disabled={isEditMode || isDirector}
          />
          <TextField
            label="Año Académico"
            required
            value={String(anioAcademico)}
            onChange={(v) => onChange({ anioAcademico: Number(v.replace(/\D/g, '')) || 0 })}
            placeholder="2024"
            disabled={isEditMode}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text">
              Baremo (Escala de Calificación) <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-5 mt-0.5">
              {BAREMOS.map((b) => (
                <label key={b.value} className="flex items-center gap-2 cursor-pointer text-sm text-text">
                  <input
                    type="radio"
                    name="baremo"
                    checked={baremo === b.value}
                    onChange={() => onChange({ baremo: b.value })}
                    className="accent-primary"
                  />
                  {b.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de niveles de logro */}
        <div className="border border-border rounded-xl h-fit">
          <div className="grid grid-cols-[44px_minmax(160px,1fr)_80px_60px] gap-2 bg-muted/40 px-3 py-2 text-[0.6rem] font-bold uppercase tracking-wider text-text-muted">
            <span>Nivel</span>
            <span>Denominación</span>
            <span>Rango Mín.</span>
            <span>Color</span>
          </div>
          {niveles.map((n, i) => (
            <div
              key={n.nivel}
              className="grid grid-cols-[44px_minmax(160px,1fr)_80px_60px] gap-2 items-start px-3 py-2 border-t border-border"
            >
              <span className="font-bold text-sm text-text pt-1">{n.nivel}</span>
              <textarea
                value={n.denominacion}
                onChange={(e) => setNivel(i, { denominacion: e.target.value })}
                rows={1}
                className="text-xs border border-input rounded-md px-2 py-1 bg-transparent w-full resize-none overflow-hidden"
              />
              <input
                value={String(n.rangoMin)}
                onChange={(e) => setNivel(i, { rangoMin: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                className="text-xs border border-input rounded-md px-2 py-1 bg-transparent w-full"
              />
              <input
                type="color"
                value={n.color}
                onChange={(e) => setNivel(i, { color: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-border mt-1"
              />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
};
