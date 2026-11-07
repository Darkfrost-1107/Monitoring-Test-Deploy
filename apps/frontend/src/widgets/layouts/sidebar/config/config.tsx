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

export type SeccionMenu =
  | 'PRINCIPAL'
  | 'MONITOREO'
  | 'EQUIPO Y COMUNIDAD'
  | 'EVALUACIÓN Y REPORTES'
  | 'MI ESPACIO'
  | 'ADMINISTRACIÓN';

export interface MenuCategory {
  id: MenuItem | string;
  label: string;
  icon: React.ReactNode;
  path?: string; // Opcional si solo es un contenedor de hijos
  children: MenuChild[];
  section: SeccionMenu;
}

// Estructura de navegación centralizada y agrupada semánticamente
export const SIDEBAR_CONFIG: MenuCategory[] = [
  // ── PRINCIPAL ──
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    path: '/dashboard',
    children: [],
    section: 'PRINCIPAL',
  },

  // ── MONITOREO PEDAGÓGICO ──
  {
    id: 'monitoreo',
    label: 'Monitoreo',
    icon: <Compass className="h-[18px] w-[18px]" />,
    section: 'MONITOREO',
    children: [
      { id: 'monitoreo_plan', label: 'Plan de Monitoreo', path: '/monitoreo/plan' },
      { id: 'monitoreo_gestion', label: 'Gestión de Monitoreo', path: '/monitoreo/gestion' },
      { id: 'monitoreo_plan_anual', label: 'Plan Monitoreo Anual', path: '/monitoreo/plan-anual' },
      { id: 'monitoreo_cronograma', label: 'Cronograma', path: '/monitoreo/cronograma' },
      { id: 'monitoreo_calendario', label: 'Calendario', path: '/monitoreo/calendario' },
    ],
  },
  {
    id: 'solicitudes_visita',
    label: 'Solicitudes de visita',
    icon: <CalendarClock className="h-[18px] w-[18px]" />,
    path: '/monitoreo/solicitudes-visita',
    children: [],
    section: 'MONITOREO',
  },
  {
    id: 'focos_atencion',
    label: 'Focos de Atención',
    icon: <AlertTriangle className="h-[18px] w-[18px]" />,
    path: '/focos-atencion',
    children: [],
    section: 'MONITOREO',
  },

  // ── EQUIPO Y COMUNIDAD EDUCATIVA ──
  {
    id: 'instituciones_padron',
    label: 'Padrón de II. EE.',
    icon: <School className="h-[18px] w-[18px]" />,
    path: '/instituciones/padron',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },
  {
    id: 'especialistas',
    label: 'Especialistas',
    icon: <Users className="h-[18px] w-[18px]" />,
    path: '/especialistas',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },
  {
    id: 'jefes_area',
    label: 'Responsables de Nivel',
    icon: <Briefcase className="h-[18px] w-[18px]" />,
    path: '/jefes-area',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },
  {
    id: 'instituciones_docentes',
    label: 'Docentes',
    icon: <GraduationCap className="h-[18px] w-[18px]" />,
    path: '/instituciones/docentes',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },
  {
    id: 'instituciones_subdirectores',
    label: 'Subdirectores',
    icon: <Users className="h-[18px] w-[18px]" />,
    path: '/instituciones/subdirectores',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },
  {
    id: 'instituciones_coordinadores',
    label: 'Coordinador Pedagógico',
    icon: <Users className="h-[18px] w-[18px]" />,
    path: '/instituciones/coordinadores',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },
  {
    id: 'instituciones_jefes_taller',
    label: 'Jefe de Taller',
    icon: <Briefcase className="h-[18px] w-[18px]" />,
    path: '/instituciones/jefes-taller',
    children: [],
    section: 'EQUIPO Y COMUNIDAD',
  },

  // ── EVALUACIÓN Y REPORTES ──
  {
    id: 'plantillas',
    label: 'Plantillas de Monitoreo',
    icon: <ClipboardList className="h-[18px] w-[18px]" />,
    section: 'EVALUACIÓN Y REPORTES',
    children: [
      { id: 'plantillas_ugel', label: 'UGEL', path: '/plantillas?filtro=ugel' },
      { id: 'plantillas_ies', label: 'Instituciones', path: '/plantillas?filtro=ie' },
      { id: 'plantillas_solicitudes', label: 'Solicitudes', path: '/plantillas/solicitudes' },
      {
        id: 'plantillas_mis_solicitudes',
        label: 'Mis Solicitudes',
        path: '/plantillas/mis-solicitudes',
      },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
    section: 'EVALUACIÓN Y REPORTES',
    children: [
      { id: 'reportes_fichas', label: 'Fichas Completadas', path: '/reportes' },
      { id: 'reportes_analisis', label: 'Análisis de Desempeño', path: '/reportes/analisis' },
    ],
  },

  // ── MI ESPACIO PERSONAL ──
  {
    id: 'carpeta_pedagogica',
    label: 'Mi Carpeta Pedagógica',
    icon: <FolderOpen className="h-[18px] w-[18px]" />,
    path: '/carpeta-pedagogica',
    children: [],
    section: 'MI ESPACIO',
  },
  {
    id: 'mi_firma',
    label: 'Mi Firma Digital',
    icon: <PenTool className="h-[18px] w-[18px]" />,
    path: '/mi-firma',
    children: [],
    section: 'MI ESPACIO',
  },

  // ── ADMINISTRACIÓN Y SISTEMA ──
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: <Settings className="h-[18px] w-[18px]" />,
    path: '/configuracion',
    children: [],
    section: 'ADMINISTRACIÓN',
  },
  {
    id: 'superadmin',
    label: 'Superadmin Panel',
    icon: <Shield className="h-[18px] w-[18px]" />,
    section: 'ADMINISTRACIÓN',
    children: [
      { id: 'superadmin_director', label: 'Director UGEL', path: '/superadmin/director' },
      { id: 'superadmin_jefe', label: 'Jefe de Gestión', path: '/superadmin/jefe' },
    ],
  },
];
