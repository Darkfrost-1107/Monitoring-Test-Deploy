import { RoleCode } from '@sistema-monitoreo/shared-contracts';
import { useUser } from '@entities/model-user';
import { DirectoresPage } from '../jefeArea/DirectoresPage';
import { DocentesPage } from './DocentesPage';
import { DocenteCreatePage as JefeDocenteCreatePage } from '../jefeArea/DocenteCreatePage';
import { DocenteCreatePage as DirectorDocenteCreatePage } from './DocenteCreatePage';
import { DocenteEditPage as JefeDocenteEditPage } from '../jefeArea/DocenteEditPage';
import { DocenteEditPage as DirectorDocenteEditPage } from './DocenteEditPage';
import { DocenteDetailPage as JefeDocenteDetailPage } from '../jefeArea/DocenteDetailPage';
import { DocenteDetailPage as DirectorDocenteDetailPage } from './DocenteDetailPage';
import { CoordinadoresPage } from './CoordinadoresPage';
import { JefesAreaPage } from '../jefeGestion/JefesAreaPage';
import { CoordinadorAssignPage } from './CoordinadorAssignPage';
import { JefeAreaCreatePage } from '../jefeGestion/JefeAreaCreatePage';

/**
 * Cada ruta del padrón tiene dos versiones: la que ve un director desde su
 * institución y la que ve la UGEL. Estos componentes eligen entre ambas.
 *
 * La condición se comprueba contra el rol y no contra `useScope().isInstitution`
 * a propósito: `isInstitution` abarca también al coordinador pedagógico, al jefe
 * de taller y al docente, que hoy no alcanzan estas rutas —`ROLE_PERMISSIONS` no
 * les concede los ítems correspondientes— pero que si algún día las alcanzaran
 * recibirían la vista de director, que no les corresponde. La comprobación
 * estrecha no depende de esa garantía externa.
 *
 * Estaba repetida seis veces, una por switcher.
 */
const useEsDirectorDeInstitucion = (): boolean => {
  const { user } = useUser();
  return user?.role === RoleCode.DIRECTOR_INSTITUCION;
};

export const DocenteListSwitcher = () =>
  useEsDirectorDeInstitucion() ? <DocentesPage /> : <DirectoresPage />;

export const DocenteCreateSwitcher = () =>
  useEsDirectorDeInstitucion() ? <DirectorDocenteCreatePage /> : <JefeDocenteCreatePage />;

export const DocenteEditSwitcher = () =>
  useEsDirectorDeInstitucion() ? <DirectorDocenteEditPage /> : <JefeDocenteEditPage />;

export const DocenteDetailSwitcher = () =>
  useEsDirectorDeInstitucion() ? <DirectorDocenteDetailPage /> : <JefeDocenteDetailPage />;

export const CoordinadorSwitcher = () =>
  useEsDirectorDeInstitucion() ? <CoordinadoresPage /> : <JefesAreaPage />;

export const CoordinadorCreateSwitcher = () =>
  useEsDirectorDeInstitucion() ? <CoordinadorAssignPage /> : <JefeAreaCreatePage />;
