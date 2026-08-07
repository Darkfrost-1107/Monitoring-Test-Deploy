import { SelectField, TextField } from '@shared/ui/form-controls';
import { MODALIDAD_NIVEL_MAP } from '@sistema-monitoreo/shared-contracts';
import type { EspecialistaFormData } from '@entities/model-especialistas/validator';
import {
  ESPECIALIDADES_DE_PRIMARIA,
  OPCIONES_DE_ESCALA,
  SIN_ESCALA,
  perfilAlCambiarModalidad,
} from '../lib/perfil-especialista';
import { EspecialidadesExtras } from './EspecialidadesExtras';

/**
 * Modalidad, nivel, escala y especialidades de un especialista de UGEL.
 *
 * Eran doscientas líneas dentro de `EspecialistaFormBase`, con el catálogo de
 * escalas escrito dos veces en el mismo archivo —una por cada rama del
 * condicional de superadministrador—.
 */

const DOS_COLUMNAS = 'grid grid-cols-1 md:grid-cols-2 gap-[18px]';

const MODALIDADES = [
  { value: 'EBR', label: 'EBR (Básica Regular)' },
  { value: 'EBA', label: 'EBA (Básica Alternativa)' },
  { value: 'EBE', label: 'EBE (Básica Especial)' },
  { value: 'CEPTRO', label: 'CEPTRO (Técnico Productiva)' },
];

const CONDICIONES = ['Encargado', 'Destacado', 'Designado'] as const;

interface Props {
  form: EspecialistaFormData;
  onChange: <K extends keyof EspecialistaFormData>(
    campo: K,
    valor: EspecialistaFormData[K],
  ) => void;
  onReemplazar: (cambios: Partial<EspecialistaFormData>) => void;
  showError: (campo: string) => string;
  bloqueado: boolean;
}

export const PerfilDeEspecialista = ({
  form,
  onChange,
  onReemplazar,
  showError,
  bloqueado,
}: Props) => {
  const esSecundaria = form.nivelEducativo === 'Secundaria';
  const esPrimaria = form.nivelEducativo === 'Primaria';
  const niveles = MODALIDAD_NIVEL_MAP[form.modalidad || 'EBR'] ?? [];

  return (
    <>
      <div className={DOS_COLUMNAS}>
        <SelectField
          label="Cargo *"
          required
          value={form.cargo}
          onChange={(v) => onChange('cargo', v as EspecialistaFormData['cargo'])}
          options={[
            { value: 'Especialista', label: 'Especialista' },
            { value: 'Jefe de Área', label: 'Jefe de Área' },
            { value: 'Jefe de Gestión', label: 'Jefe de Gestión' },
          ]}
          // El cargo lo determina la pantalla desde la que se entra.
          disabled
          placeholder="Seleccione Cargo"
          error={showError('cargo')}
        />
        <SelectField
          label="Condición Laboral *"
          required
          value={form.condicionLaboral}
          onChange={(v) => onChange('condicionLaboral', v as EspecialistaFormData['condicionLaboral'])}
          options={CONDICIONES.map((c) => ({ value: c, label: c }))}
          placeholder="Seleccione Condición"
          error={showError('condicionLaboral')}
          disabled={bloqueado}
        />
      </div>

      <div className={`${DOS_COLUMNAS} mt-[18px]`}>
        <SelectField
          label="Modalidad *"
          required
          value={form.modalidad}
          onChange={(v) =>
            onReemplazar({
              modalidad: v as EspecialistaFormData['modalidad'],
              ...perfilAlCambiarModalidad(v),
            })
          }
          options={MODALIDADES}
          placeholder="Seleccione Modalidad"
          error={showError('modalidad')}
          disabled={bloqueado}
        />
        <SelectField
          label="Nivel Educativo *"
          required
          value={form.nivelEducativo}
          onChange={(v) =>
            onReemplazar({
              nivelEducativo: v,
              especialidad: '',
              especialidades: [],
              especialidadesExtras: [],
            })
          }
          options={niveles.map((n) => ({ value: n, label: n }))}
          placeholder="Seleccione Nivel"
          error={showError('nivelEducativo')}
          disabled={bloqueado}
        />
      </div>

      <div className={`${DOS_COLUMNAS} mt-[18px]`}>
        <EscalaMagisterial form={form} onChange={onChange} showError={showError} bloqueado={bloqueado} />

        {esPrimaria && (
          <SelectField
            label="Especialidad"
            value={form.especialidad || SIN_ESCALA}
            onChange={(v) => onChange('especialidad', v === SIN_ESCALA ? '' : v)}
            options={[
              { value: SIN_ESCALA, label: 'Ninguna / No aplica' },
              { value: ESPECIALIDADES_DE_PRIMARIA[0], label: 'PIP (Profesor de Innovación Pedagógica)' },
              { value: ESPECIALIDADES_DE_PRIMARIA[1], label: 'Educación Física' },
            ]}
            placeholder="Seleccione Especialidad"
            error={showError('especialidad')}
          />
        )}

        {esSecundaria && (
          <TextField
            label="Especialidad Principal *"
            required
            value={form.especialidad || ''}
            onChange={(v) => onChange('especialidad', v)}
            placeholder="Ej. Matemática, CTA, Comunicación..."
            error={showError('especialidad')}
          />
        )}
      </div>

      {esSecundaria && (
        <EspecialidadesExtras
          extras={form.especialidadesExtras ?? []}
          principal={form.especialidad}
          onCambiar={(extras) => onChange('especialidadesExtras', extras)}
        />
      )}

      <div className="mt-[18px]">
        <CargaLaboral form={form} onChange={onChange} showError={showError} bloqueado={bloqueado} />
      </div>
    </>
  );
};

interface CampoProps {
  form: EspecialistaFormData;
  onChange: <K extends keyof EspecialistaFormData>(
    campo: K,
    valor: EspecialistaFormData[K],
  ) => void;
  showError: (campo: string) => string;
  bloqueado: boolean;
}

/** El mismo campo que necesitan la vista normal y la de superadministrador. */
export const EscalaMagisterial = ({ form, onChange, showError, bloqueado }: CampoProps) => (
  <SelectField
    label="Escala Magisterial"
    value={form.escalaMagisterial?.toString() || SIN_ESCALA}
    onChange={(v) => onChange('escalaMagisterial', v === SIN_ESCALA ? undefined : Number(v))}
    options={OPCIONES_DE_ESCALA}
    placeholder="Seleccione Escala Magisterial"
    error={showError('escalaMagisterial')}
    disabled={bloqueado}
  />
);

export const CargaLaboral = ({ form, onChange, showError, bloqueado }: CampoProps) => (
  <TextField
    label="Carga Laboral (Horas) *"
    required
    value={form.cargaLaboral?.toString() || ''}
    onChange={(v) => onChange('cargaLaboral', v ? Number(v.replace(/\D/g, '')) : 40)}
    placeholder="Ej. 40"
    error={showError('cargaLaboral')}
    disabled={bloqueado}
  />
);
