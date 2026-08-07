import { useState, useMemo, useCallback } from 'react';
import { Briefcase } from 'lucide-react';
import { CONDICION_DIRECTIVA, ESCALAS_MAGISTERIALES } from '@entities/model-docentes';
import type { DirectorFormData } from '@entities/model-docentes/validator';
import { directorSchema } from '@entities/model-docentes/validator';
import {
  SectionCard,
  TextField,
  SelectField,
  FormButton,
  DatosPersonalesSection,
} from '@shared/ui/form-controls';
import {
  twoCols,
} from '@shared/ui/form-controls.types';
import { usePersonForm } from '@shared/hooks/usePersonForm';
import {
  DATOS_BASICOS_VACIOS,
  datosBasicosDePersona,
  escalaMagisterialARomano,
  especialidadDeDocente,
  opcionesDeInstitucion,
  soloDefinidos,
} from '@shared/lib/persona-formulario';
import { ConfirmarRolAdicional } from '@features/personas/ui/ConfirmarRolAdicional';

/** Condiciones laborales que corresponden a un cargo directivo. */
const CONDICIONES_DE_DIRECTOR: readonly string[] = ['Designado', 'Encargado', 'Por Función'];

const INITIAL: DirectorFormData = {
  nombres: '',
  apellidos: '',
  dni: '',
  correo: '',
  celular: '',
  condicion: 'Designado',
  escala: 'I',
  institucionId: '',
  nivelEducativo: 'PRIMARIA',
  especialidad: '',
  cargaHoraria: 40,
};

interface Props {
  onCancel: () => void;
  onSubmit: (data: DirectorFormData) => void;
  isLoading: boolean;
  initialData?: DirectorFormData;
  // IEs disponibles para asignar
  instituciones: { id: string; nombre: string; nivel?: string }[];
  submitLabel?: string;
  serverError?: string | null;
}

export const DirectorFormBase = ({
  onCancel,
  onSubmit,
  isLoading,
  initialData,
  instituciones,
  submitLabel,
  serverError,
}: Props) => {
  const [form, setForm] = useState<DirectorFormData>(() => ({
    ...INITIAL,
    ...initialData,
  }));

  const set = <K extends keyof DirectorFormData>(key: K, value: DirectorFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleInstitucionChange = (id: string) => {
    set('institucionId', id);
    const selectedIe = instituciones.find((i) => i.id === id);
    if (selectedIe && selectedIe.nivel) {
      set('nivelEducativo', selectedIe.nivel);
    }
  };


  const {
    showError,
    celularRef,
    persona,
    searchingDni,
    isDniLocked,
    dniMessage,
    dniBloqueadoPorRol,
    showRoleConfirm,
    setShowRoleConfirm,
    handleSubmit,
    handleConfirmRole,
    dniOk,
    roleCheck,
  } = usePersonForm({
    dni: form.dni,
    isNew: !initialData,
    rolObjetivo: 'director',
    onValidSubmit: () => onSubmit(form),
    isLoading,
    schema: directorSchema,
    form,
    serverError,
    setPersonaFields: useCallback((persona) => {
      const docente = persona.docente;
      // Un director sólo puede estar designado, encargado o por función; el
      // resto de las condiciones laborales no le corresponden.
      const condicion =
        docente?.condicionLaboral && CONDICIONES_DE_DIRECTOR.includes(docente.condicionLaboral)
          ? (docente.condicionLaboral as DirectorFormData['condicion'])
          : undefined;

      setForm((prev) => ({
        ...prev,
        ...datosBasicosDePersona(persona),
        ...soloDefinidos({
          condicion,
          escala: (docente?.escalaMagisterial
            ? escalaMagisterialARomano(docente.escalaMagisterial, 'I')
            : undefined) as DirectorFormData['escala'] | undefined,
          institucionId: docente?.institucionId,
          nivelEducativo: docente?.nivelEducativo,
          especialidad: especialidadDeDocente(docente),
        }),
      }));
    }, []),
    clearPersonaFields: useCallback(() => {
      setForm((prev) => ({ ...prev, ...DATOS_BASICOS_VACIOS }));
    }, []),
  });



  const opcionesIE = useMemo(
    () => opcionesDeInstitucion(instituciones, persona?.docente?.institucion),
    [instituciones, persona],
  );

  return (
    <div className="bg-bg p-0 flex flex-col gap-5 text-text animate-in fade-in-0 duration-300">
      {/* Información Personal Unificada */}
      <DatosPersonalesSection
        form={form}
        onChange={set}
        showError={showError}
        searchingDni={searchingDni}
        dniOk={dniOk}
        celularOk={/^9\d{8}$/.test(form.celular)}
        isDniLocked={isDniLocked}
        dniBloqueadoPorRol={dniBloqueadoPorRol}
        dniMessage={dniMessage}
        roleCheck={roleCheck}
        celularRef={celularRef}
      />

      {/* Detalles Laborales */}
      <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles Laborales">
        <div style={twoCols}>
          <SelectField
            label="Cargo Institucional"
            required
            value="Director"
            onChange={() => undefined}
            options={[{ value: 'Director', label: 'Director de I.E.' }]}
            placeholder="Director de I.E."
            disabled
          />
          <SelectField
            label="Condición Laboral"
            required
            value={form.condicion}
            onChange={(v) => set('condicion', v as DirectorFormData['condicion'])}
            options={CONDICION_DIRECTIVA.map((c) => ({ value: c, label: c }))}
            placeholder="Seleccione condición"
            error={showError('condicion')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
        <div style={{ ...twoCols, marginTop: 18 }}>
          <SelectField
            label="Institución Educativa"
            required
            value={form.institucionId}
            onChange={handleInstitucionChange}
            options={opcionesIE}
            placeholder="Seleccione la I.E."
            error={showError('institucionId')}
            disabled={dniBloqueadoPorRol || !!persona?.docente?.institucionId}
          />
          <TextField
            label="Nivel Educativo"
            required
            value={form.nivelEducativo}
            onChange={() => undefined}
            placeholder="Autocompletado de la I.E."
            error={showError('nivelEducativo')}
            disabled
          />
        </div>
        <div style={{ ...twoCols, marginTop: 18 }}>
          <TextField
            label="Especialidad / Mención"
            required
            value={form.especialidad}
            onChange={(v) => set('especialidad', v)}
            placeholder="Ej. Matemática, Gestión Pedagógica"
            error={showError('especialidad')}
            disabled={dniBloqueadoPorRol}
          />
          <SelectField
            label="Escala Magisterial"
            required
            value={form.escala}
            onChange={(v) => set('escala', v as "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII")}
            options={ESCALAS_MAGISTERIALES}
            placeholder="Seleccione Escala"
            error={showError('escala')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
        <div className="mt-[18px] max-w-xs">
          <TextField
            label="Carga Laboral (Horas)"
            required
            value={form.cargaHoraria?.toString() || ''}
            onChange={(v) => set('cargaHoraria', v ? Number(v.replace(/\D/g, '')) : 40)}
            placeholder="40"
            error={showError('cargaHoraria')}
            disabled={dniBloqueadoPorRol}
          />
        </div>
      </SectionCard>

      {/* Botones */}
      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton
          onClick={handleSubmit}
          disabled={isLoading || dniBloqueadoPorRol}
        >
          {isLoading ? 'Guardando...' : submitLabel || 'Guardar Director'}
        </FormButton>
      </div>

      {showRoleConfirm && persona && (
        <ConfirmarRolAdicional
          persona={persona}
          nuevoRol="Director de I.E."
          onConfirmar={handleConfirmRole}
          onCancelar={() => setShowRoleConfirm(false)}
        />
      )}
    </div>
  );
};
