import { DocenteListPageBase } from './DocenteListPageBase';

export const SubdirectoresPage = () => {
  return (
    <DocenteListPageBase
      title="Gestión de Subdirectores"
      description="Administración y asignación de Subdirectores de la institución educativa."
      actionText="Asignar Subdirector"
      createPath="/instituciones/subdirectores/nuevo"
      secondaryActionText="Registrar nuevo"
      secondaryCreatePath="/instituciones/subdirectores/registrar"
      targetCargo="Subdirector"
      itemName="subdirectores"
      loadingLabel="Cargando subdirectores..."
    />
  );
};
