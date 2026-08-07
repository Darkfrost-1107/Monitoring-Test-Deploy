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
import { ConfirmModal } from '@shared/ui/ConfirmModal';
import { usePersonForm } from '@shared/hooks/usePersonForm';
import {
  DATOS_BASICOS_VACIOS,
  datosBasicosDePersona,
  escalaMagisterialARomano,
  especialidadDeDocente,
  soloDefinidos,
} from '@shared/lib/persona-formulario';

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



  const opcionesIE = useMemo(() => {
    const list = instituciones.map((i) => ({ value: i.id, label: i.nombre }));
    if (persona?.docente?.institucion) {
      const exists = list.some(i => i.value === persona.docente!.institucion!.id);
      if (!exists) {
        list.push({ value: persona.docente!.institucion!.id, label: persona.docente!.institucion!.nombre });
      }
    }
    return list;
  }, [instituciones, persona]);

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
        <ConfirmModal
          title="Confirmar creación con rol adicional"
          message={
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                La persona <strong>{persona.nombres} {persona.apellidos}</strong> (DNI {persona.dni}) ya está registrada en el sistema.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-amber-800">
                <p className="font-semibold">Roles actuales:</p>
                <ul className="list-disc list-inside mt-1 text-[0.72rem]">
                  {persona.roles.esDirector && <li>Director de I.E.</li>}
                  {persona.roles.esCoordinadorPedagogico && <li>Coordinador Pedagógico</li>}
                  {persona.roles.esJefeTaller && <li>Jefe de Taller</li>}
                  {persona.roles.esDocenteAula && <li>Docente de Aula</li>}
                  {persona.roles.esEspecialista && <li>{persona.roles.especialistaCargoActivo} ({persona.roles.especialistaNivelEducativo})</li>}
                </ul>
              </div>
              <p>
                Se creará un nuevo registro como <strong>Director de I.E.</strong> además de los roles existentes. ¿Desea continuar?
              </p>
            </div>
          }
          confirmLabel="Sí, crear con rol adicional"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmRole}
          onCancel={() => setShowRoleConfirm(false)}
        />
      )}
    </div>
  );
};
