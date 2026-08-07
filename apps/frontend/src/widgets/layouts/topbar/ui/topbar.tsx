import { useLocation } from 'react-router-dom';
import { useUser } from '@entities/model-user'; // Entidad limpia
import { ROLE_LABELS } from '@sistema-monitoreo/shared-contracts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@shared/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Button } from '@shared/ui/button';
import { HelpCircle, LogOut, ChevronDown, Menu, ChevronRight } from 'lucide-react';
import { NotificationsBell } from '@features/notifications';
import { getPageTitle, ROOT_CRUMB } from '../config/breadcrumbs'; // Importamos la lógica

interface TopbarProps {
  onOpenMobileSidebar?: () => void;
}

export const Topbar = ({ onOpenMobileSidebar }: TopbarProps) => {
  // 1. Hooks de estado y enrutamiento
  const { user, logout } = useUser();
  const location = useLocation();

  // 2. Cálculo automático del título basado en la URL
  const title = getPageTitle(location.pathname, user?.role);
  // Evitamos "UGEL Lampa › UGEL Lampa" cuando el título cae al prefijo raíz.
  const showRootCrumb = title !== ROOT_CRUMB;

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface/95 border-b border-border backdrop-blur-xl sticky top-0 z-20">
      {/* ── Izquierda: hamburger (móvil) + breadcrumb ── */}
      <div className="flex items-center gap-3">
        {/* Hamburger — solo visible en móvil */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="h-9 w-9 text-text-muted hover:text-text hover:bg-muted cursor-pointer rounded-lg md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb Automático */}
        <div className="flex items-center gap-2 text-[0.83rem]">
          {showRootCrumb && (
            <>
              <span className="text-text-muted hidden sm:inline">{ROOT_CRUMB}</span>
              <ChevronRight className="h-3.5 w-3.5 text-text-dim hidden sm:block" />
            </>
          )}
          <span className="text-text font-semibold">{title}</span>
        </div>
      </div>

      {/* ── Derecha: acciones + usuario ── */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Notificaciones */}
        <NotificationsBell />

        {/* Ayuda — oculto en móvil */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-text-muted hover:text-text hover:bg-muted cursor-pointer rounded-lg hidden sm:flex"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>

        {/* Menú de Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 bg-bg border border-border rounded-[10px] cursor-pointer hover:bg-border transition-colors outline-none">
              {/* Avatar */}
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary text-white text-[0.68rem] font-bold">
                  {user?.nombres?.[0] ?? 'U'}
                  {user?.apellidos?.[0] ?? 'E'}
                </AvatarFallback>
              </Avatar>

              {/* Nombre + rol — solo visible en sm+ */}
              <div className="flex-col text-left hidden sm:flex">
                <span className="text-text text-[0.78rem] font-semibold whitespace-nowrap">
                  {user?.nombres} {user?.apellidos?.split(' ')[0]}
                </span>
                <span className="text-text-muted text-[0.65rem] whitespace-nowrap capitalize">
                  {user ? ROLE_LABELS[user.role] : ''}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted hidden sm:block" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 z-50">
            <DropdownMenuLabel className="sm:hidden block">
              <p className="font-semibold text-text text-xs m-0">
                {user?.nombres} {user?.apellidos}
              </p>
              <p className="text-[0.65rem] text-text-muted m-0 capitalize">
                {user ? ROLE_LABELS[user.role] : ''}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="sm:hidden block" />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
