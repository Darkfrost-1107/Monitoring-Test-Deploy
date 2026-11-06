import { DocenteListPageBase } from './DocenteListPageBase';

export const SubdirectoresPage = () => {
  return (
    <DocenteListPageBase
      title="Gestión de Subdirectores"
      description="Administración y registro del personal directivo / subdirectores de la institución."
      actionText="Registrar Subdirector"
      createPath="/instituciones/subdirectores/nuevo"
      targetCargo="Subdirector"
      itemName="subdirectores"
      loadingLabel="Cargando subdirectores..."
    />
  );
};
