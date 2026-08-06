import { useState } from 'react';
import { Book, MapPin, Check } from 'lucide-react';
import {
  DISTRITOS_LAMPA,
  ZONAS,
  type Nivel,
  MODALIDAD_NIVEL_MAP,
} from '@entities/model-instituciones/constants';
import {
  FormButton,
  SectionCard,
  SelectField,
  TextAreaField,
  TextField,
  toOptions,
  twoCols,
} from '@shared/ui/form-controls';
import { useUser } from '@entities/model-user';
import { RoleCode } from '@sistema-monitoreo/shared-contracts';

export interface InstitutionRawInput {
  codigoModular: string;
  codigoLocal: string;
  nombre: string;
  nivel: '' | Nivel;
  provincia: string;
  distrito: string;
  zona: string;
  direccion: string;
  modalidad?: string;
}

interface Props {
  onCancel: () => void;
  onSubmit: (data: InstitutionRawInput) => void;
  isLoading: boolean;
  initialData?: InstitutionRawInput;
}

const INITIAL_FORM: InstitutionRawInput = {
  codigoModular: '',
  codigoLocal: '',
  nombre: '',
  nivel: '',
  provincia: 'Lampa',
  distrito: '',
  zona: '',
  direccion: '',
  modalidad: '',
};

export const InstitutionFormBase = ({ onCancel, onSubmit, isLoading, initialData }: Props) => {
  const { user } = useUser();
  const isJefeArea = user?.role === RoleCode.JEFE_AREA;
  const jefeNivel = user?.especialistaNivel;

  // Filtrar modalidades permitidas
  const allowedModalidades = (() => {
    if (!isJefeArea || !jefeNivel) {
      return [
        { value: 'EBR', label: 'Educación Básica Regular (EBR)' },
        { value: 'EBA', label: 'Educación Básica Alternativa (EBA)' },
        { value: 'EBE', label: 'Educación Básica Especial (EBE)' },
        { value: 'CEPTRO', label: 'CEPTRO' },
      ];
    }
    const list = [];
    if (jefeNivel === 'Inicial') {
      list.push({ value: 'EBR', label: 'Educación Básica Regular (EBR)' });
      list.push({ value: 'EBE', label: 'Educación Básica Especial (EBE)' });
    } else if (jefeNivel === 'Primaria') {
      list.push({ value: 'EBR', label: 'Educación Básica Regular (EBR)' });
    } else if (jefeNivel === 'Secundaria') {
      list.push({ value: 'EBR', label: 'Educación Básica Regular (EBR)' });
      list.push({ value: 'EBA', label: 'Educación Básica Alternativa (EBA)' });
      list.push({ value: 'CEPTRO', label: 'CEPTRO' });
    }
    return list;
  })();

  // Filtrar niveles permitidos según modalidad y jefe
  const getAllowedNiveles = (mod: string) => {
    const allNiveles = MODALIDAD_NIVEL_MAP[mod] || [];
    if (!isJefeArea || !jefeNivel) {
      return allNiveles;
    }
    if (mod === 'EBR') {
      return allNiveles.filter((n) => n === jefeNivel);
    }
    return allNiveles;
  };

  const defaultModalidad = allowedModalidades[0]?.value || '';
  const defaultNivel = getAllowedNiveles(defaultModalidad)[0] || '';

  const [form, setForm] = useState<InstitutionRawInput>(() => {
    if (initialData) return initialData;
    return {
      ...INITIAL_FORM,
      modalidad: defaultModalidad,
      nivel: defaultNivel as string,
    };
  });
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof InstitutionRawInput>(key: K, value: InstitutionRawInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const codigoOk = /^\d{7}$/.test(form.codigoModular);
  const codigoLocalOk = /^\d{8}$/.test(form.codigoLocal);
  const errors = {
    codigoModular: !form.codigoModular ? 'Obligatorio' : !codigoOk ? 'Deben ser 7 dígitos' : '',
    codigoLocal: !form.codigoLocal ? 'Obligatorio' : !codigoLocalOk ? 'Deben ser 8 dígitos' : '',
    nombre: !form.nombre.trim() ? 'Obligatorio' : '',
    nivel: !form.nivel ? 'Seleccione nivel' : '',
    provincia: !form.provincia ? 'Seleccione provincia' : '',
    distrito: !form.distrito ? 'Seleccione distrito' : '',
    zona: !form.zona ? 'Seleccione zona' : '',
    direccion: !form.direccion.trim() ? 'Obligatorio' : '',
    modalidad: !form.modalidad ? 'Seleccione modalidad' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const showError = (key: keyof typeof errors) => (submitted ? errors[key] : '');

  const handleSubmit = () => {
    setSubmitted(true);
    if (hasErrors || isLoading) return;
    onSubmit(form);
  };

  const availableNiveles = form.modalidad ? getAllowedNiveles(form.modalidad) : [];

  return (
    <div className="bg-bg p-0 flex flex-col gap-5 text-text animate-in fade-in-0 duration-300">
      <SectionCard icon={<Book className="w-5 h-5" />} title="Información General">
        <div style={twoCols}>
          <TextField
            label="Código Modular (7 dígitos)"
            required
            value={form.codigoModular}
            onChange={(v) => set('codigoModular', v.replace(/\D/g, '').slice(0, 7))}
            placeholder="Ej. 0645213"
            error={showError('codigoModular')}
            disabled={!!initialData}
            adornment={
              codigoOk ? (
                <Check className="w-[18px] h-[18px] text-green-500" strokeWidth={2.5} />
              ) : undefined
            }
          />
          <TextField
            label="Código de Local (8 dígitos)"
            required
            value={form.codigoLocal}
            onChange={(v) => set('codigoLocal', v.replace(/\D/g, '').slice(0, 8))}
            placeholder="Ej. 12457896"
            error={showError('codigoLocal')}
            adornment={
              codigoLocalOk ? (
                <Check className="w-[18px] h-[18px] text-green-500" strokeWidth={2.5} />
              ) : undefined
            }
          />
        </div>
        <div className="w-full mt-[18px]">
          <TextField
            label="Nombre de la Institución Educativa"
            required
            value={form.nombre}
            onChange={(v) => set('nombre', v)}
            placeholder="Ej. I.E. 70045"
            error={showError('nombre')}
          />
        </div>
        <div style={{ ...twoCols, marginTop: 18 }}>
          <SelectField
            label="Modalidad"
            required
            value={form.modalidad || ''}
            onChange={(v) => {
              const nextLevels = getAllowedNiveles(v);
              setForm((prev) => ({ ...prev, modalidad: v, nivel: (nextLevels[0] || '') as string }));
            }}
            options={allowedModalidades}
            placeholder="Seleccione Modalidad"
            disabled={isLoading || allowedModalidades.length <= 1}
            error={showError('modalidad')}
          />
          <SelectField
            label="Nivel Educativo"
            required
            value={form.nivel}
            onChange={(v) => set('nivel', v as '' | Nivel)}
            options={availableNiveles.map((n) => ({ value: n, label: n }))}
            placeholder={form.modalidad ? 'Seleccione Nivel' : 'Seleccione primero una modalidad'}
            disabled={!form.modalidad || availableNiveles.length <= 1 || isLoading}
            error={showError('nivel')}
          />
        </div>
      </SectionCard>

      <SectionCard icon={<MapPin className="w-5 h-5" />} title="Ubicación Geográfica">
        <div style={twoCols}>
          <TextField label="Departamento" value="Puno" onChange={() => {}} disabled />
          <TextField label="Provincia" value="Lampa" onChange={() => {}} disabled />
        </div>
        <div style={{ ...twoCols, marginTop: 18 }}>
          <SelectField
            label="Distrito"
            required
            value={form.distrito}
            onChange={(v) => set('distrito', v)}
            options={toOptions(DISTRITOS_LAMPA)}
            placeholder="Seleccione Distrito"
            error={showError('distrito')}
          />
          <SelectField
            label="Zona"
            required
            value={form.zona}
            onChange={(v) => set('zona', v)}
            options={toOptions(ZONAS)}
            placeholder="Seleccione Zona"
            error={showError('zona')}
          />
        </div>
        <div style={{ marginTop: 18 }}>
          <TextAreaField
            label="Dirección Exacta / Referencia"
            required
            value={form.direccion}
            onChange={(v) => set('direccion', v)}
            placeholder="Ej. Jr. Comercio s/n"
            error={showError('direccion')}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end gap-3 mt-2">
        <FormButton variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </FormButton>
        <FormButton onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Institución'}
        </FormButton>
      </div>
    </div>
  );
};
