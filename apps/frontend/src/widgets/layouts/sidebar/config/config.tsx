import {
  LayoutDashboard,
  Compass,
  School,
  GraduationCap,
  Users,
  Briefcase,
  BarChart3,
  ClipboardList,
  Settings,
  Shield,
  CalendarClock,
  AlertTriangle,
  PenTool,
  FolderOpen,
} from 'lucide-react';
import type { MenuItem } from '@shared/constants/roles';

export interface MenuChild {
  id: MenuItem | string;
  label: string;
  path: string;
}

export interface MenuCategory {
  id: MenuItem | string;
  label: string;
  icon: React.ReactNode;
  path?: string; // Opcional si solo es un contenedor de hijos
  children: MenuChild[];
}

// Toda tu estructura de navegación centralizada
export const SIDEBAR_CONFIG: MenuCategory[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    path: '/dashboard',
    children: [],
  },
  /**
   * Análisis de Desempeño como sección propia, del lado de la institución.
   *
   * Para los roles de UGEL vive dentro del grupo «Reportes». Ese grupo se
   * colapsa en «Mis Reportes» para quien es evaluado —el personal de la I.E.—,
   * y al vaciarle los hijos el análisis quedaba inalcanzable desde el menú
   * aunque el rol tuviera el permiso. Acá recupera su entrada, junto al
   * Dashboard, que es desde donde el director mira su institución.
   */
  {
    id: 'reportes_analisis',
    label: 'Análisis de Desempeño',
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
    path: '/reportes/analisis',
    children: [],
  },
  {
    id: 'monitoreo',
    label: 'Monitoreo',
    icon: <Compass className="h-[18px] w-[18px]" />,
    children: [
      { id: 'monitoreo_plan', label: 'Plan de Monitoreo', path: '/monitoreo/plan' },
      { id: 'monitoreo_gestion', label: 'Gestión de Monitoreo', path: '/monitoreo/gestion' },
      { id: 'monitoreo_plan_anual', label: 'Plan Monitoreo Anual', path: '/monitoreo/plan-anual' },
      { id: 'monitoreo_cronograma', label: 'Cronograma', path: '/monitoreo/cronograma' },
      { id: 'monitoreo_calendario', label: 'Calendario', path: '/monitoreo/calendario' },
      { id: 'monitoreo_reportes', label: 'Fichas Completadas', path: '/monitoreo/reportes' },
    ],
  },
  {
    id: 'instituciones_padron',
    label: 'Instituciones',
    icon: <School className="h-[18px] w-[18px]" />,
    path: '/instituciones/padron',
    children: [
      { id: 'instituciones_padron_lista', label: 'Padrón de II. EE.', path: '/instituciones/padron' },
    ],
  },
  {
    id: 'instituciones_docentes',
    label: 'Docentes',
    icon: <GraduationCap className="h-[18px] w-[18px]" />,
    path: '/instituciones/docentes',
    children: [],
  },
  {
    id: 'instituciones_coordinadores',
    label: 'Coordinador Pedagógico',
    icon: <Users className="h-[18px] w-[18px]" />,
    path: '/instituciones/coordinadores',
    children: [],
  },
  {
    id: 'instituciones_jefes_taller',
    label: 'Jefe de Taller',
    icon: <Briefcase className="h-[18px] w-[18px]" />,
    path: '/instituciones/jefes-taller',
    children: [],
  },
  {
    id: 'especialistas',
    label: 'Especialistas',
    icon: <Users className="h-[18px] w-[18px]" />,
    path: '/especialistas',
    children: [],
  },
  {
    id: 'jefes_area',
    label: 'Jefes de Área',
    icon: <Briefcase className="h-[18px] w-[18px]" />,
    path: '/jefes-area',
    children: [],
  },
  {
    id: 'plantillas',
    label: 'Plantillas de Monitoreo',
    icon: <ClipboardList className="h-[18px] w-[18px]" />,
    children: [
      { id: 'plantillas_ugel', label: 'UGEL', path: '/plantillas?filtro=ugel' },
      { id: 'plantillas_ies', label: 'Instituciones', path: '/plantillas?filtro=ie' },
    ],
  },
  {
    id: 'focos_atencion',
    label: 'Focos de Atención',
    icon: <AlertTriangle className="h-[18px] w-[18px]" />,
    path: '/focos-atencion',
    children: [],
  },
  {
    id: 'solicitudes_visita',
    label: 'Solicitudes de visita',
    icon: <CalendarClock className="h-[18px] w-[18px]" />,
    path: '/monitoreo/solicitudes-visita',
    children: [],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
    children: [
      { id: 'reportes_fichas', label: 'Fichas Completadas', path: '/reportes' },
      { id: 'reportes_analisis', label: 'Análisis de Desempeño', path: '/reportes/analisis' },
    ],
  },
  {
    id: 'carpeta_pedagogica',
    label: 'Mi Carpeta Pedagógica',
    icon: <FolderOpen className="h-[18px] w-[18px]" />,
    path: '/carpeta-pedagogica',
    children: [],
  },
  {
    id: 'mi_firma',
    label: 'Mi Firma',
    icon: <PenTool className="h-[18px] w-[18px]" />,
    path: '/mi-firma',
    children: [],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: <Settings className="h-[18px] w-[18px]" />,
    path: '/configuracion',
    children: [],
  },
  {
    id: 'superadmin',
    label: 'Superadmin Panel',
    icon: <Shield className="h-[18px] w-[18px]" />,
    children: [
      { id: 'superadmin_director', label: 'Director UGEL', path: '/superadmin/director' },
      { id: 'superadmin_jefe', label: 'Jefe de Gestión', path: '/superadmin/jefe' },
    ],
  },
];
