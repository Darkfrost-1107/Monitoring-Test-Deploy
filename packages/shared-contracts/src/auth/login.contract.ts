export interface ILoginRequest {
  dni: string;
  password: string;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    dni: string;
    nombres: string;
    apellidos: string;
    role: string;
    /**
     * Capacidades efectivas del usuario, calculadas por el backend componiendo
     * rol, cargo de especialista y cargos docentes activos.
     *
     * Sirven para que el frontend decida QUÉ MOSTRAR. No son un control de
     * seguridad: la autorización real la aplica `PermissionsGuard` en cada
     * petición. Ver `capabilities.constants.ts`.
     */
    permissions: string[];
    institucion?: string;
    institucionNombre?: string;
    institucionNivel?: string;
    /**
     * Registro de Docente de esta persona, si lo tiene.
     *
     * Permite reconocer las evaluaciones propias comparando identificadores en
     * lugar de nombres.
     */
    docenteId?: string;
    especialistaId?: string;
    especialistaNivel?: string;
    especialistaModalidad?: string;
    especialistaEspecialidades?: string[];
    distrito?: string;
    firstLogin: boolean;
  };
}

export interface ILoginError {
  message?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  failedAttempts?: number;
  remainingAttempts?: number;
}
