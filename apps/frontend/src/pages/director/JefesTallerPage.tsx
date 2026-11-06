import { DocenteListPageBase } from './DocenteListPageBase';

export const JefesTallerPage = () => {
  return (
    <DocenteListPageBase
      title="Gestión de Jefes de Taller"
      description="Administración y asignación de Jefes de Taller de la institución."
      actionText="Asignar Jefe de Taller"
      createPath="/instituciones/jefes-taller/nuevo"
      secondaryActionText="Registrar nuevo"
      secondaryCreatePath="/instituciones/jefes-taller/registrar"
      targetCargo="Jefe de Taller"
      itemName="jefes-taller"
      loadingLabel="Cargando jefes de taller..."
    />
  );
};
