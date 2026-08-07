import { useState, useMemo, useCallback } from 'react';
import { Briefcase } from 'lucide-react';
import { CARGA_HORARIA } from '@shared/config/constants';
import type { EspecialistaFormData } from '@entities/model-especialistas/validator';
import { especialistaSchema } from '@entities/model-especialistas/validator';
import {
  FormButton,
  SectionCard,
  SelectField,
  DatosPersonalesSection,
} from '@shared/ui/form-controls';
import { usePersonForm } from '@shared/hooks/usePersonForm';
import { DATOS_BASICOS_VACIOS, datosBasicosDePersona } from '@shared/lib/persona-formulario';
import { ConfirmarRolAdicional } from '@features/personas/ui/ConfirmarRolAdicional';
import { erroresDelPerfil, especialidadesReunidas } from '../lib/perfil-especialista';
import { PerfilDeEspecialista, EscalaMagisterial, CargaLaboral } from './PerfilDeEspecialista';

/**
 * Alta y edición del personal de UGEL: especialistas, jefes de área y de
 * gestión.
 *
 * Eran 490 líneas. El condicional de superadministrador partía el formulario en
 * dos ramas que repetían el catálogo de escalas y el campo de carga laboral, y
 * el modal de rol adicional estaba copiado palabra por palabra desde los
 * formularios de docente y director.
 */

interface Props {
  onCancel: () => void;
  onSubmit: (data: EspecialistaFormData) => void;
  isLoading: boolean;
  initialData?: EspecialistaFormData;
  isJefeArea?: boolean;
  serverError?: string | null;
  isSuperadminCreate?: boolean;
  targetRole?: 'director_ugel' | 'jefe_gestion';
}

const FORMULARIO_VACIO: EspecialistaFormData = {
  nombres: '',
  apellidos: '',
  dni: '',
  correo: '',
  celular: '',
  especialidades: [],
  especialidad: '',
  especialidadesExtras: [],
  nivelEducativo: 'Primaria',
  modalidad: 'EBR',
  cargo: 'Especialista',
  activo: true,
  condicionLaboral: 'Encargado',
  cargaLaboral: CARGA_HORARIA.ESPECIALISTA,
  escalaMagisterial: undefined,
};

/** Con qué rol se comprueba el conflicto de la persona encontrada por DNI. */
const ROL_OBJETIVO: Record<string, 'jefe_area' | 'jefe_gestion' | 'especialista'> = {
  'Jefe de Área': 'jefe_area',
  'Jefe de Gestión': 'jefe_gestion',
};

export const EspecialistaFormBase = ({
  onCancel,
  onSubmit,
  isLoading,
  initialData,
  isJefeArea = false,
  serverError,
  isSuperadminCreate = false,
  targetRole,
}: Props) => {
  const [form, setForm] = useState<EspecialistaFormData>(() => {
    const base: EspecialistaFormData = {
      ...FORMULARIO_VACIO,
      cargo: isJefeArea ? 'Jefe de Área' : 'Especialista',
      condicionLaboral: isJefeArea ? 'Designado' : 'Encargado',
      ...initialData,
    };

    // Los registros guardados traen una sola lista; el formulario la separa en
    // principal y extras para poder editarlas por separado.
    if (initialData?.especialidades?.length && !base.especialidad) {
      base.especialidad = initialData.especialidades[0];
      base.especialidadesExtras =
        initialData.especialidadesExtras ?? initialData.especialidades.slice(1);
    }

    return base;
  });

  const set = <K extends keyof EspecialistaFormData>(campo: K, valor: EspecialistaFormData[K]) =>
    setForm((previo) => ({ ...previo, [campo]: valor }));

  const reemplazar = (cambios: Partial<EspecialistaFormData>) =>
    setForm((previo) => ({ ...previo, ...cambios }));

  // Reglas propias del cargo que el esquema no expresa. Se aplican encima de
  // las del esquema dentro de `usePersonForm`.
  const erroresExtra = useMemo(() => erroresDelPerfil(form), [form]);

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
    isNew: !initialData?.dni,
    rolObjetivo: ROL_OBJETIVO[form.cargo] ?? 'especialista',
    cargoObjetivo: form.cargo,
    onValidSubmit: () =>
      onSubmit({
        ...form,
        especialidades: especialidadesReunidas(form.especialidad, form.especialidadesExtras),
      }),
    isLoading,
    schema: especialistaSchema,
    form,
    erroresExtra,
    serverError,
    setPersonaFields: useCallback((persona) => {
      setForm((previo) => ({
        ...previo,
        ...datosBasicosDePersona(persona),
        ...(persona.docente?.cursoAsignado
          ? { especialidad: persona.docente.cursoAsignado }
          : {}),
      }));
    }, []),
    clearPersonaFields: useCallback(() => {
      setForm((previo) => ({ ...previo, ...DATOS_BASICOS_VACIOS }));
    }, []),
  });

  const campos = { form, onChange: set, showError, bloqueado: dniBloqueadoPorRol };

  return (
    <div className="bg-bg p-0 flex flex-col gap-5 text-text animate-in fade-in-0 duration-300">
      <DatosPersonalesSection
        form={form}
        onChange={set}
        showError={showError}
        searchingDni={searchingDni}
        dniOk={dniOk}
        celularOk={form.celular ? /^9\d{8}$/.test(form.celular) : false}
        isDniLocked={isDniLocked}
        dniBloqueadoPorRol={dniBloqueadoPorRol}
        dniMessage={dniMessage}
        roleCheck={roleCheck}
        celularRef={celularRef}
      />

      <SectionCard
        icon={<Briefcase className="w-5 h-5" />}
        title="Detalles Profesionales / Laborales"
      >
        {isSuperadminCreate ? (
          // El superadministrador crea cargos de UGEL sin modalidad ni nivel:
          // no atienden un nivel educativo concreto.
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
              <SelectField
                label="Cargo *"
                required
                value={form.cargo}
                onChange={(v) => set('cargo', v as EspecialistaFormData['cargo'])}
                options={
                  targetRole === 'director_ugel'
                    ? [{ value: 'Especialista', label: 'Director UGEL' }]
                    : [{ value: 'Jefe de Gestión', label: 'Jefe de Gestión' }]
                }
                disabled
                placeholder="Seleccione Cargo"
                error={showError('cargo')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mt-[18px]">
              <EscalaMagisterial {...campos} />
              <CargaLaboral {...campos} />
            </div>
          </>
        ) : (
          <PerfilDeEspecialista
            form={form}
            onChange={set}
            onReemplazar={reemplazar}
            showError={showError}
            bloqueado={dniBloqueadoPorRol}
          />
        )}
      </SectionCard>

      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={handleSubmit} disabled={isLoading || dniBloqueadoPorRol}>
          {isLoading ? 'Guardando...' : 'Guardar Datos'}
        </FormButton>
      </div>

      {showRoleConfirm && persona && (
        <ConfirmarRolAdicional
          persona={persona}
          nuevoRol={form.cargo}
          onConfirmar={handleConfirmRole}
          onCancelar={() => setShowRoleConfirm(false)}
        />
      )}
    </div>
  );
};
