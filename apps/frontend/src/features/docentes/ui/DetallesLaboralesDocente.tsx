import { Briefcase } from 'lucide-react';
import { SectionCard, SelectField, TextField } from '@shared/ui/form-controls';
import { twoCols } from '@shared/ui/form-controls.types';
import { ESCALAS_MAGISTERIALES } from '@entities/model-docentes';
import { NIVELES, NIVEL_LABEL } from '@entities/model-instituciones';
import type { DocenteFormData } from '@entities/model-docentes/validator';
import {
  cargosDisponibles,
  condicionesDelCargo,
  especialidadesDelNivel,
} from '../lib/grados-y-secciones';
import { EspecialidadesExtrasDocente } from './EspecialidadesExtrasDocente';

/**
 * Los datos laborales de un docente: institución, cargo, condición, nivel,
 * especialidad y carga horaria.
 *
 * Eran ciento cincuenta líneas dentro de `DocenteFormBase`, con cuatro
 * catálogos de opciones calculados en funciones anónimas dentro de los props.
 */

interface Props {
  form: DocenteFormData;
  onChange: <K extends keyof DocenteFormData>(campo: K, valor: DocenteFormData[K]) => void;
  onCambiarCargo: (cargo: DocenteFormData['cargo']) => void;
  onCambiarNivel: (nivel: DocenteFormData['nivelEducativo']) => void;
  showError: (campo: string) => string;
  bloqueado: boolean;
  /** El personal de la I.E. no elige institución ni nivel: son los suyos. */
  esDirectorDeInstitucion: boolean;
  institucionPropia?: string;
  opcionesDeInstitucion: { value: string; label: string }[];
  institucionBloqueada: boolean;
}

export const DetallesLaboralesDocente = ({
  form,
  onChange,
  onCambiarCargo,
  onCambiarNivel,
  showError,
  bloqueado,
  esDirectorDeInstitucion,
  institucionPropia,
  opcionesDeInstitucion,
  institucionBloqueada,
}: Props) => (
  <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles Laborales">
    <div style={twoCols}>
      <div className="w-full">
        {esDirectorDeInstitucion ? (
          <CampoFijo
            label="Institución de Destino (I.E.)"
            valor={institucionPropia || 'I.E. No Asignada'}
          />
        ) : (
          <SelectField
            label="Institución de Destino (I.E.)"
            required
            value={form.institucionId}
            onChange={(v) => onChange('institucionId', v)}
            options={opcionesDeInstitucion}
            placeholder="Seleccione la I.E."
            error={showError('institucionId')}
            disabled={bloqueado || institucionBloqueada}
          />
        )}
      </div>

      <SelectField
        label="Cargo / Rol"
        required
        value={form.cargo}
        onChange={(v) => onCambiarCargo(v as DocenteFormData['cargo'])}
        options={cargosDisponibles(form.nivelEducativo, form.cargo).map((c) => ({
          value: c,
          label: c,
        }))}
        placeholder="Seleccione Cargo"
        error={showError('cargo')}
        disabled={bloqueado}
      />
    </div>

    <div style={{ ...twoCols, marginTop: 18 }}>
      <SelectField
        label="Condición Laboral"
        required
        value={form.condicion}
        onChange={(v) => onChange('condicion', v as DocenteFormData['condicion'])}
        options={condicionesDelCargo(form.cargo).map((c) => ({ value: c, label: c }))}
        placeholder="Seleccione Condición"
        error={showError('condicion')}
        disabled={bloqueado}
      />
      <SelectField
        label="Escala Magisterial"
        required
        value={form.escala}
        onChange={(v) => onChange('escala', v as DocenteFormData['escala'])}
        options={ESCALAS_MAGISTERIALES}
        placeholder="Seleccione Escala"
        error={showError('escala')}
        disabled={bloqueado}
      />
    </div>

    <div style={{ ...twoCols, marginTop: 18 }}>
      {esDirectorDeInstitucion ? (
        <CampoFijo label="Nivel Educativo" valor={NIVEL_LABEL[form.nivelEducativo]} />
      ) : (
        <SelectField
          label="Nivel Educativo"
          required
          value={form.nivelEducativo}
          onChange={(v) => onCambiarNivel(v as DocenteFormData['nivelEducativo'])}
          options={NIVELES.map((n) => ({ value: n, label: NIVEL_LABEL[n] }))}
          placeholder="Seleccione Nivel"
          error={showError('nivelEducativo')}
          disabled={bloqueado}
        />
      )}
      <SelectField
        label="Especialidad / Mención"
        required={form.nivelEducativo === 'SECUNDARIA'}
        value={form.especialidad || ''}
        onChange={(v) => onChange('especialidad', v)}
        options={especialidadesDelNivel(form.nivelEducativo, form.especialidad).map((e) => ({
          value: e,
          label: e,
        }))}
        placeholder="Seleccione Especialidad"
        error={showError('especialidad')}
        disabled={bloqueado}
      />
    </div>

    {form.nivelEducativo === 'SECUNDARIA' && (
      <div style={{ marginTop: 18 }}>
        <EspecialidadesExtrasDocente
          nivel={form.nivelEducativo}
          principal={form.especialidad}
          extras={form.especialidadesExtras ?? []}
          onCambiar={(extras) => onChange('especialidadesExtras', extras)}
          disabled={bloqueado}
        />
      </div>
    )}

    <div style={{ marginTop: 18, maxWidth: 'calc(50% - 9px)', minWidth: 240 }}>
      <TextField
        label="Carga Horaria Semanal (Horas)"
        required
        value={String(form.cargaHoraria)}
        onChange={(v) => onChange('cargaHoraria', Number(v.replace(/\D/g, '')))}
        placeholder="Ej. 30"
        error={showError('cargaHoraria')}
        disabled={bloqueado}
      />
    </div>
  </SectionCard>
);

/** Dato que el ámbito del usuario ya determina y por eso no se elige. */
const CampoFijo = ({ label, valor }: { label: string; valor: string }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs font-bold text-text-muted">{label}</label>
    <div className="flex items-center h-9 px-3 rounded-lg border border-border bg-muted/30 text-text font-medium text-sm">
      {valor}
    </div>
  </div>
);
