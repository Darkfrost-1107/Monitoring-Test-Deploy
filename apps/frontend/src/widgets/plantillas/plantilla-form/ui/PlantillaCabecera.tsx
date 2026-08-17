import { Settings } from 'lucide-react';
import { SectionCard, SelectField, TextField } from '@shared/ui/form-controls';
import type { Baremo, NivelCalificacion } from '@entities/model-plantillas';
import { TIPOS_MONITOREO, BAREMOS } from '@entities/model-plantillas';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { CampoLemaOficial } from './CampoLemaOficial';

interface Props {
  tipoMonitoreo: string;
  anioAcademico: number;
  /** Lema oficial del año, ya resuelto por el formulario. */
  lema: string;
  /** Lo que el año tiene guardado, o nulo si todavía no se cargó. */
  lemaGuardado: string | null;
  cargandoLema: boolean;
  onLemaChange: (lema: string) => void;
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
  lema,
  lemaGuardado,
  cargandoLema,
  onLemaChange,
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
          <CampoLemaOficial
            anioAcademico={anioAcademico}
            lema={lema}
            lemaGuardado={lemaGuardado}
            cargando={cargandoLema}
            onChange={onLemaChange}
          />
          {tipoMonitoreo === 'Monitoreo Docente EIB' ? (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-text-muted">
              <span className="font-bold text-primary block mb-0.5">Formato de Observación EIB</span>
              Instrumento estructurado por criterios/ítems cualitativos evaluados bajo escala tripartita normativa.
            </div>
          ) : (
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
          )}
        </div>

        {/* Tabla de niveles de logro o Escala EIB */}
        {tipoMonitoreo === 'Monitoreo Docente EIB' ? (
          <div className="border border-border rounded-xl p-4 bg-muted/20 flex flex-col gap-3 h-fit">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Escala de Valoración de Criterios (Lista de Cotejo)
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-600 text-white shrink-0">Sí</span>
                <span className="text-xs text-text">La práctica, condición o evidencia se presenta de forma clara y consistente.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-amber-500 text-white shrink-0">Parcialmente</span>
                <span className="text-xs text-text">Se observan indicios o avances parciales, pero requiere fortalecimiento.</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-500 text-white shrink-0">No</span>
                <span className="text-xs text-text">No se evidencia la práctica pedagógica o el documento en la visita.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-xl h-fit">
            <div className="grid grid-cols-[44px_minmax(160px,1fr)_80px_60px] gap-2 bg-muted/40 px-3 py-2 text-[0.6rem] font-bold uppercase tracking-wider text-text-muted">
              <span>Nivel</span>
              <span>Denominación</span>
              {/* Qué mide el corte depende del baremo elegido arriba. */}
              <span>{baremo === 'Porcentual' ? '% Mín.' : 'Rango Mín.'}</span>
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
        )}
      </div>
    </SectionCard>
  );
};
