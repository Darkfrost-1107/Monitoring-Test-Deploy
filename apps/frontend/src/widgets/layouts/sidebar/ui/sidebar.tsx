import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@entities/model-user';
import { ROLE_LABELS, RoleCode } from '@sistema-monitoreo/shared-contracts';
import { ROLE_PERMISSIONS } from '@shared/constants/roles';
import type { MenuItem } from '@shared/constants/roles';
import { HelpCircle, LogOut, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shared/ui/collapsible';
import { useSolicitudesPendientesCount } from '@features/visit-requests';
import { useCan, useScope, Capability } from '@shared/auth';

// Importamos la configuración pura
import { SIDEBAR_CONFIG } from '../config/config';

export const Sidebar = () => {
  // 1. Estados Locales y Hooks de Navegación
  const { user, logout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['monitoreo']);

  // 2. Lógica de Permisos (Intacta de tu código original)
  const permissions = (user && ROLE_PERMISSIONS[user.role]) ?? [];
  const has = (id: string) => permissions.includes(id as MenuItem);

  // Badge de solicitudes de visita "por atender": lo ve quien las gestiona. El
  // Jefe de Área solo hace seguimiento de las suyas y no tiene visitas:gestionar.
  const { can } = useCan();
  const { isUgel, isInstitution } = useScope();
  const { data: solicitudesPendientes = 0 } = useSolicitudesPendientesCount(
    can(Capability.VISITAS_GESTIONAR),
  );

  const toggleMenu = (id: string) =>
    setOpenMenus((p) => (p.includes(id) ? p.filter((m) => m !== id) : [...p, id]));

  return (
    <aside
      className={`
        flex flex-col bg-surface border-r border-border h-full min-h-screen flex-shrink-0
        transition-[width] duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[240px]'}
      `}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-[18px] border-b border-border min-h-[64px]">
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <img src="/logo-ugel.png" alt="UGEL Logo" className="w-full h-full object-contain" />
        </div>

        {!collapsed && (
          <div className="flex flex-col overflow-hidden flex-1 animate-in fade-in-0 duration-200">
            <span className="text-text font-extrabold text-[0.95rem] whitespace-nowrap">
              UGEL Lampa
            </span>
            <span className="text-text-muted text-[0.63rem] whitespace-nowrap">
              {user ? ROLE_LABELS[user.role] : 'Jefe de Gestión'}
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto h-7 w-7 rounded-lg text-text-muted hover:text-text hover:bg-muted hidden md:flex flex-shrink-0 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Navegación Dinámica ── */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
        {(() => {
          // Quien es estrictamente evaluado, en lugar de evaluar en aula: el docente.
          const isEvaluatedRole = user?.role === RoleCode.DOCENTE;

          const baseItems = SIDEBAR_CONFIG.filter((item) => {
            // Los cargos de Coordinador Pedagógico y Jefe de Taller sólo existen
            // en EBR, nivel Secundaria — la misma regla que aplica
            // `validateCargoRestrictivo` en el backend.
            const tieneInstitucion = !!user?.institucionNivel;
            const esSecundaria = user?.institucionNivel?.toUpperCase() === 'SECUNDARIA';
            if (
              (item.id === 'instituciones_coordinadores' || item.id === 'instituciones_jefes_taller') &&
              tieneInstitucion &&
              !esSecundaria
            ) {
              return false;
            }
            return has(item.id as string) || item.children.some((c) => has(c.id as string));
          });

          // Procesa ítems con lógica de rol y auto-aplanado para hijos únicos
          const processedItems = baseItems.map((item) => {
            const visibleChildren = item.children.filter((c) => has(c.id as string));

            if (item.id === 'reportes' && isEvaluatedRole) {
              return {
                ...item,
                label: 'Mis Reportes',
                path: '/reportes',
                children: [],
              };
            }

            // Auto-aplanado: si solo hay 1 hijo visible y no es un caso con menú compuesto,
            // se convierte directamente en botón de nivel 1 para ahorrar clics innecesarios
            if (visibleChildren.length === 1 && !item.path) {
              return {
                ...item,
                label: visibleChildren[0].label,
                path: visibleChildren[0].path,
                children: [],
              };
            }

            return { ...item, children: visibleChildren };
          });

          // Secciones temáticas en orden visual
          const SECTIONS = [
            { key: 'PRINCIPAL', label: 'Principal' },
            { key: 'MONITOREO', label: 'Monitoreo' },
            { key: 'EQUIPO Y COMUNIDAD', label: 'Equipo y Comunidad' },
            { key: 'EVALUACIÓN Y REPORTES', label: 'Evaluación y Reportes' },
            { key: 'MI ESPACIO', label: 'Mi Espacio' },
            { key: 'ADMINISTRACIÓN', label: 'Administración' },
          ] as const;

          let isFirstRenderedSection = true;

          return SECTIONS.map((sec) => {
            const sectionItems = processedItems.filter((i) => i.section === sec.key);
            if (sectionItems.length === 0) return null;

            const isFirst = isFirstRenderedSection;
            isFirstRenderedSection = false;

            return (
              <div key={sec.key} className="flex flex-col">
                {/* Encabezado de sección / Divisor */}
                {!collapsed ? (
                  <div
                    className={`px-3 pb-1 text-[10px] font-bold text-text-dim/70 tracking-wider uppercase select-none ${
                      isFirst ? 'pt-1.5' : 'pt-3.5'
                    }`}
                  >
                    {sec.label}
                  </div>
                ) : (
                  !isFirst && <div className="my-1.5 border-t border-border/40 mx-2" />
                )}

                {/* Ítems de la sección */}
                <div className="flex flex-col gap-0.5">
                  {sectionItems.map((item) => {
                    const visibleChildren = item.children;
                    const isOpen = openMenus.includes(item.id as string);

                    // Lógica de estado activo por ruta (URL)
                    const isActive =
                      (item.path && location.pathname === item.path) ||
                      visibleChildren.some((c) =>
                        c.path === '/reportes'
                          ? location.pathname === '/reportes'
                          : location.pathname.startsWith(c.path),
                      );

                    // Etiquetas adaptables según el contexto del usuario
                    const displayLabel =
                      item.id === 'instituciones_docentes'
                        ? isUgel
                          ? 'Directores'
                          : 'Docentes'
                        : item.id === 'monitoreo' && (can(Capability.VISITAS_GESTIONAR) || isInstitution)
                          ? 'Plan Monitoreo'
                          : item.label;

                    const triggerClasses = `
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] border-none
                      cursor-pointer transition-all text-left text-[0.875rem] font-medium outline-none
                      ${
                        isActive
                          ? 'bg-primary-light text-primary font-semibold'
                          : 'bg-transparent text-text-muted hover:bg-bg hover:text-text'
                      }
                    `;

                    const badgeCount = item.id === 'solicitudes_visita' ? solicitudesPendientes : 0;

                    const TriggerContent = (
                      <>
                        <span className="relative flex-shrink-0 flex">
                          {item.icon}
                          {collapsed && badgeCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary border border-surface" />
                          )}
                        </span>
                        {!collapsed && <span className="flex-1 truncate">{displayLabel}</span>}
                        {!collapsed && badgeCount > 0 && (
                          <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                        {!collapsed && visibleChildren.length > 0 && (
                          <span
                            className={`text-text-dim flex transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </>
                    );

                    // Renderizado con submenú (Collapsible)
                    if (visibleChildren.length > 0) {
                      return (
                        <Collapsible
                          key={item.id}
                          open={isOpen}
                          onOpenChange={() => toggleMenu(item.id as string)}
                          className="flex flex-col"
                        >
                          <CollapsibleTrigger asChild title={collapsed ? displayLabel : undefined}>
                            <button className={triggerClasses}>{TriggerContent}</button>
                          </CollapsibleTrigger>
                          {!collapsed && (
                            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                              <div className="pl-10 flex flex-col gap-0.5 mt-0.5 pb-1">
                                {visibleChildren.map((child) => {
                                  const isChildActive =
                                    child.path === '/reportes'
                                      ? location.pathname === '/reportes'
                                      : location.pathname.startsWith(child.path);

                                  return (
                                    <button
                                      key={child.id}
                                      onClick={() => navigate(child.path)}
                                      className={`
                                        flex items-center gap-2 px-3 py-2 rounded-lg border-none
                                        cursor-pointer text-left text-[0.82rem] transition-all bg-transparent outline-none
                                        ${
                                          isChildActive
                                            ? 'text-primary font-semibold'
                                            : 'text-text-muted hover:text-text hover:bg-bg'
                                        }
                                      `}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                                      {child.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          )}
                        </Collapsible>
                      );
                    }

                    // Renderizado de botón normal directo
                    return (
                      <div key={item.id} className="flex flex-col">
                        <button
                          onClick={() => navigate(item.path!)}
                          title={collapsed ? displayLabel : undefined}
                          className={triggerClasses}
                        >
                          {TriggerContent}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </nav>

      {/* ── Footer ── */}
      <div className="p-2 border-t border-border flex flex-col gap-1">
        {!collapsed && (
          <button className="flex items-center gap-2.5 px-3 py-2 rounded-lg border-none bg-transparent text-text-muted text-[0.78rem] cursor-pointer hover:bg-bg hover:text-text transition-colors text-left outline-none">
            <HelpCircle className="h-[15px] w-[15px]" />
            Soporte técnico
          </button>
        )}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg border-none bg-transparent text-danger text-[0.84rem] cursor-pointer hover:bg-danger/10 transition-colors text-left outline-none"
        >
          <LogOut className="h-[17px] w-[17px]" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
};
