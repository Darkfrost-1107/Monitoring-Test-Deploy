import type {
  JefeAreaCreateFormData,
  JefeAreaEditFormData,
} from '@entities/model-jefes-area/validator';
import { FormularioEdicionJefeArea } from './FormularioEdicionJefeArea';
import { FormularioAscensoJefeArea } from './FormularioAscensoJefeArea';

/**
 * Punto de entrada de los formularios de Jefe de Área.
 *
 * Eran 368 líneas con dos formularios adentro: el de edición y el de ascenso,
 * con sus dos estados, sus dos validaciones y sus dos árboles de maquetación,
 * repartidos alrededor de un `if (isEdit)` a mitad del componente. Nada
 * compartían salvo los botones del pie.
 *
 * Se conserva el nombre y la forma de los props porque `AddJefeArea` y
 * `EditJefeArea` los usan; lo que decide acá es a cuál de los dos ir.
 */

interface Props {
  onCancel: () => void;
  onSubmit: (data: JefeAreaEditFormData | JefeAreaCreateFormData) => void;
  isLoading: boolean;
  initialData?: Partial<JefeAreaEditFormData & JefeAreaCreateFormData>;
  isEdit?: boolean;
  serverError?: string | null;
}

export const JefeAreaFormBase = ({
  onCancel,
  onSubmit,
  isLoading,
  initialData,
  isEdit = false,
  serverError,
}: Props) => {
  if (isEdit) {
    return (
      <FormularioEdicionJefeArea
        initialData={initialData}
        isLoading={isLoading}
        serverError={serverError}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );
  }

  return (
    <FormularioAscensoJefeArea
      isLoading={isLoading}
      serverError={serverError}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
};
