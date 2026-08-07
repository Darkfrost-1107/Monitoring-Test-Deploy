import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import {
  FormButton,
  SectionCard,
  SelectField,
  TextField,
  DatosPersonalesSection,
} from '@shared/ui/form-controls';
import { mensajeDeError } from '@shared/lib/errores-formulario';
import { extractErrors } from '@shared/hooks/usePersonForm';
import { useFocoEnCelular } from '@shared/hooks/use-foco-en-celular';
import { CARGA_HORARIA } from '@shared/config/constants';
import { jefeAreaEditSchema } from '@entities/model-jefes-area/validator';
import type { JefeAreaEditFormData } from '@entities/model-jefes-area/validator';
import { opcionesDeNivel, type NivelJefeArea } from '../lib/niveles-jefe-area';

/**
 * Edición de un Jefe de Área ya nombrado.
 *
 * Convivía con el formulario de ascenso dentro de `JefeAreaFormBase`: dos
 * estados, dos validaciones y dos árboles de maquetación que no compartían
 * nada, separados por un `if (isEdit)` a mitad del componente.
 *
 * Ni el nivel ni la carga horaria se editan acá: el nivel se decide al ascender
 * —y cambiarlo es otra operación— y la carga de un Jefe de Área es fija, regla
 * que el backend impone en `especialista.service.ts`.
 */

interface Props {
  initialData?: Partial<JefeAreaEditFormData>;
  isLoading: boolean;
  serverError?: string | null;
  onSubmit: (data: JefeAreaEditFormData) => void;
  onCancel: () => void;
}

export const FormularioEdicionJefeArea = ({
  initialData,
  isLoading,
  serverError,
  onSubmit,
  onCancel,
}: Props) => {
  const [form, setForm] = useState<JefeAreaEditFormData>({
    nombres: initialData?.nombres || '',
    apellidos: initialData?.apellidos || '',
    dni: initialData?.dni || '',
    correo: initialData?.correo || '',
    celular: initialData?.celular || '',
    cargaHoraria: initialData?.cargaHoraria || CARGA_HORARIA.JEFE_AREA,
    nivelEducativo: initialData?.nivelEducativo || 'Secundaria',
    activo: initialData?.activo ?? true,
  });
  const [enviado, setEnviado] = useState(false);

  const celularRef = useFocoEnCelular(serverError);

  const errores = extractErrors(jefeAreaEditSchema.safeParse(form));
  const showError = (campo: string) => mensajeDeError(campo, { errores, enviado, serverError });

  const cambiar = <K extends keyof JefeAreaEditFormData>(campo: K, valor: JefeAreaEditFormData[K]) =>
    setForm((previo) => ({ ...previo, [campo]: valor }));

  const guardar = () => {
    setEnviado(true);
    if (Object.keys(errores).length > 0) return;
    onSubmit(form);
  };

  return (
    <div className="bg-bg p-0 flex flex-col gap-6 text-text animate-in fade-in-0 duration-300">
      <DatosPersonalesSection
        form={form}
        onChange={cambiar}
        showError={showError}
        isDniLocked
        celularOk={form.celular ? /^9\d{8}$/.test(form.celular) : false}
        celularRef={celularRef}
      />

      <SectionCard icon={<Briefcase className="w-5 h-5" />} title="Detalles del Puesto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
          <SelectField
            label="Nivel Educativo a Cargo"
            required
            disabled
            value={form.nivelEducativo}
            onChange={(v) => cambiar('nivelEducativo', v as NivelJefeArea)}
            options={opcionesDeNivel([])}
            placeholder="Seleccione Nivel"
            error={showError('nivelEducativo')}
          />
          <TextField
            label="Carga Horaria (Horas)"
            required
            disabled
            value={String(CARGA_HORARIA.JEFE_AREA)}
            onChange={() => {}}
            placeholder={String(CARGA_HORARIA.JEFE_AREA)}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={guardar} disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </FormButton>
      </div>
    </div>
  );
};
