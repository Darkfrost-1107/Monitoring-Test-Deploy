import type { ReactNode } from 'react';
import { cn } from '@shared/lib/utils';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import type { Option } from './form-controls.types';

/* ============================================================
 * Controles de formulario reutilizables y responsivos,
 * integrados y estilizados con componentes de shadcn/ui.
 * Mantiene la misma API para evitar romper compatibilidad.
 * ============================================================ */

export const SectionCard = ({
  icon,
  title,
  headerRight,
  children,
}: {
  icon?: ReactNode;
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) => (
  <Card className="border border-border shadow-xs">
    <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5 space-y-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary flex-shrink-0 flex">{icon}</span>}
        <CardTitle className="text-sm font-bold text-text">{title}</CardTitle>
      </div>
      {headerRight}
    </CardHeader>
    <CardContent className="pb-4 pt-2 px-5">{children}</CardContent>
  </Card>
);

export const FieldLabel = ({ label, required }: { label: string; required?: boolean }) => (
  <Label className="text-xs font-semibold text-text mb-1 block">
    {label}
    {required && <span className="text-destructive ml-1">*</span>}
  </Label>
);

export const ErrorText = ({ message }: { message?: string }) =>
  message ? <span className="block mt-1 text-[0.72rem] text-destructive">{message}</span> : null;

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  disabled,
  adornment,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  adornment?: ReactNode;
}) => (
  <div className="flex flex-col gap-1 w-full">
    <FieldLabel label={label} required={required} />
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg text-sm transition-all',
          error && 'border-destructive focus-visible:ring-destructive/30',
          adornment && 'pr-10',
          disabled && 'bg-muted cursor-not-allowed opacity-80',
        )}
      />
      {adornment && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-text-muted">
          {adornment}
        </span>
      )}
    </div>
    <ErrorText message={error} />
  </div>
);

export const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1 w-full">
    <FieldLabel label={label} required={required} />
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'w-full text-left text-sm rounded-lg h-9 border border-input bg-transparent',
          error && 'border-destructive focus-visible:ring-destructive/30',
          disabled && 'bg-muted cursor-not-allowed opacity-80',
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] z-50">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled} className="text-sm">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <ErrorText message={error} />
  </div>
);

export const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  rows?: number;
}) => (
  <div className="flex flex-col gap-1 w-full">
    <FieldLabel label={label} required={required} />
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        'w-full rounded-lg text-sm transition-all min-h-[80px]',
        error && 'border-destructive focus-visible:ring-destructive/30',
      )}
    />
    <ErrorText message={error} />
  </div>
);

export const FormButton = ({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) => (
  <Button
    onClick={onClick}
    variant={variant === 'primary' ? 'default' : 'outline'}
    disabled={disabled}
    className={cn(
      'font-semibold rounded-lg text-sm px-4.5 py-2',
      variant === 'primary' ? 'shadow-sm' : '',
    )}
  >
    {children}
  </Button>
);

// Reexportación explícita en lugar de comodín: `react-refresh` no puede
// verificar un `export *`, y los dos tipos que acompañan al componente son
// parte de su interfaz pública.
export { DatosPersonalesSection } from './form-controls/DatosPersonalesSection';
export type {
  PersonaFormData,
  DatosPersonalesSectionProps,
} from './form-controls/DatosPersonalesSection';
