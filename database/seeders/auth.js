import { prisma } from './_lib/prisma.js';

/**
 * Auth: roles, permisos y la matriz rol-permiso.
 *
 * Se siembra ANTES de personas porque cada usuario referencia un rolId.
 *
 * Sprint 3 limpieza (Fase 1.4): permisos reducidos a 9, alineados con los
 * que @RequirePermissions() valida realmente en backend y con el modelo
 * capability-based (1.5). Los permisos `reports:own`, `jefes_area:write` y
 * `directores:write` quedan eliminados: el primero lo absorbe `reports:read`
 * + ScopeFilter; los otros dos se reintroducirán cuando se construyan los
 * controllers que los usen.
 */

const ROLES = [
  { code: 'director_ugel', name: 'Director UGEL', description: 'Director de la UGEL Lampa' },
  { code: 'jefe_area', name: 'Jefe de Área', description: 'Jefe de Área de la UGEL' },
  { code: 'jefe_gestion', name: 'Jefe de Gestión', description: 'Jefe de Gestión de la UGEL Lampa' },
  { code: 'especialista', name: 'Especialista', description: 'Especialista de Monitoreo de la UGEL' },
  { code: 'director_institucion', name: 'Director de Institución', description: 'Director de Institución Educativa' },
  { code: 'coordinador_pedagogico', name: 'Coordinador Pedagógico', description: 'Coordinador Pedagógico de Secundaria' },
  { code: 'jefe_taller', name: 'Jefe de Taller', description: 'Jefe de Taller de Secundaria' },
  { code: 'docente', name: 'Docente', description: 'Docente de Aula' },
  { code: 'invitado', name: 'Invitado', description: 'Usuario de Consulta e Invitado' },
  { code: 'superusuario', name: 'Super Administrador', description: 'Superusuario para asignación de altos cargos' },
];

const PERMISOS = [
  { codigo: 'especialistas:read', nombre: 'Leer Especialistas', descripcion: 'Permite listar y ver detalles de especialistas' },
  { codigo: 'especialistas:write', nombre: 'Gestionar Especialistas', descripcion: 'Permite crear, editar e inactivar especialistas' },
  { codigo: 'instituciones:read', nombre: 'Leer Instituciones', descripcion: 'Permite listar y ver detalles de instituciones' },
  { codigo: 'instituciones:write', nombre: 'Gestionar Instituciones', descripcion: 'Permite crear, editar y dar de baja instituciones' },
  { codigo: 'docentes:read', nombre: 'Leer Docentes', descripcion: 'Permite listar y ver detalles de docentes' },
  { codigo: 'docentes:write', nombre: 'Gestionar Docentes', descripcion: 'Permite registrar, editar y dar de baja docentes' },
  { codigo: 'monitoreo:execute', nombre: 'Realizar Monitoreo', descripcion: 'Permite ejecutar y registrar fichas de monitoreo' },
  { codigo: 'reports:read', nombre: 'Ver Reportes', descripcion: 'Permite visualizar reportes del sistema. El ScopeFilter del service decide el ámbito (todo / scope / propio).' },
  { codigo: 'dashboard:read', nombre: 'Ver Dashboard', descripcion: 'Permite visualizar el panel de control y estadísticas' },
  { codigo: 'superadmin:access', nombre: 'Acceso de Superusuario', descripcion: 'Permite asignar altos cargos (Jefe Gestión, Director UGEL)' },
];

/**
 * ATENCIÓN — esta matriz ya no gobierna la autorización. H-25 de
 * PLAN_REMEDIACION.md.
 *
 * Los permisos efectivos los calcula `computeEffectivePermissions`
 * (apps/backend/src/shared/auth/capability-map.ts) componiendo rol, cargo de
 * especialista y cargos docentes. La tabla `rol_permisos` que se siembra aquí
 * ya no se lee en tiempo de ejecución, y de hecho **ya divergió**: para
 * `director_ugel` esta matriz concede dos permisos y el mapa de capacidades
 * concede otros cuatro, distintos.
 *
 * Se conserva el sembrado porque la tabla sigue existiendo en el esquema y
 * vaciarla excede el alcance de la Fase 2, pero **no debe usarse como
 * referencia de qué puede hacer un rol**. La fuente es `capability-map.ts`.
 *
 * Retirar la tabla, sus migraciones y este bloque corresponde a la Fase 7.
 */
const ROL_PERMISOS = {
  director_ugel: ['dashboard:read', 'reports:read'],
  jefe_gestion: [
    'especialistas:read', 'especialistas:write',
    'instituciones:read', 'instituciones:write',
    'docentes:read', 'docentes:write',
    'monitoreo:execute', 'reports:read', 'dashboard:read',
  ],
  jefe_area: [
    'especialistas:read',
    'instituciones:read', 'instituciones:write',
    'docentes:read', 'docentes:write',
    'monitoreo:execute', 'reports:read',
  ],
  especialista: [
    'monitoreo:execute', 'reports:read',
    'especialistas:read', 'instituciones:read', 'docentes:read',
  ],
  director_institucion: [
    'docentes:read', 'docentes:write',
    'monitoreo:execute', 'reports:read',
    'especialistas:read', 'instituciones:read',
  ],
  coordinador_pedagogico: [
    'monitoreo:execute', 'reports:read',
    'docentes:read', 'especialistas:read', 'instituciones:read',
  ],
  jefe_taller: [
    'monitoreo:execute', 'reports:read',
    'docentes:read', 'especialistas:read', 'instituciones:read',
  ],
  docente: ['reports:read'],
  invitado: ['dashboard:read'],
  superusuario: ['superadmin:access'],
};

export async function seedAuth() {
  console.log('[auth] Seeding roles, permisos, rol_permisos...');

  const roleMap = {};
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { codigo: r.code },
      update: { nombre: r.name, descripcion: r.description },
      create: { codigo: r.code, nombre: r.name, descripcion: r.description },
    });
    roleMap[r.code] = role.id;
  }

  const permisoMap = {};
  for (const p of PERMISOS) {
    const dbPerm = await prisma.permiso.upsert({
      where: { codigo: p.codigo },
      update: { nombre: p.nombre, descripcion: p.descripcion },
      create: { codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion },
    });
    permisoMap[p.codigo] = dbPerm.id;
  }

  for (const [roleCode, permCodes] of Object.entries(ROL_PERMISOS)) {
    const rolId = roleMap[roleCode];
    if (!rolId) continue;
    for (const permCode of permCodes) {
      const permisoId = permisoMap[permCode];
      if (!permisoId) continue;
      await prisma.rolPermiso.upsert({
        where: { rolId_permisoId: { rolId, permisoId } },
        update: {},
        create: { rolId, permisoId },
      });
    }
  }

  console.log(`[auth] ${ROLES.length} roles, ${PERMISOS.length} permisos listos.`);
  return { roleMap };
}
