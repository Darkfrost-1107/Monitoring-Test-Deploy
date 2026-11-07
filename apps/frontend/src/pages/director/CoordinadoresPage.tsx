import { DocenteListPageBase } from './DocenteListPageBase';

export const CoordinadoresPage = () => {
  return (
    <DocenteListPageBase
      title="Gestión de Coordinadores Pedagógicos"
      description="Administración y asignación de Coordinadores Pedagógicos de la institución."
      actionText="Asignar Coordinador"
      createPath="/instituciones/coordinadores/nuevo"
      secondaryActionText="Registrar nuevo"
      secondaryCreatePath="/instituciones/coordinadores/registrar"
      targetCargo="Coordinador Pedagógico"
      itemName="coordinadores"
      loadingLabel="Cargando coordinadores..."
    />
  );
};
