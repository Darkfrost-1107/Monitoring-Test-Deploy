import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import bcrypt from '../../apps/backend/node_modules/bcrypt/bcrypt.js';
import { prisma } from './_lib/prisma.js';

/**
 * Personas, usuarios, especialistas y docentes REALES de UGEL Lampa.
 *
 * Fuente de datos:
 * - UGEL Admin Users: Cuentas de gestión para login (Director UGEL, Jefe de Gestión, Jefes de Área, Especialistas UGEL).
 * - NEXUS JSONs: 910 plazas reales (Directores, Subdirectores, Coordinadores, Profesores, Jefes de Laboratorio/Taller)
 *   leídas dinámicamente desde:
 *   - NEXUS_SISTEMA_MONITOREO-inicial.json
 *   - NEXUS_SISTEMA_MONITOREO-primaria.json
 *   - NEXUS_SISTEMA_MONITOREO-secundaria.json
 */

const RUTA_INICIAL = new URL('./data/NEXUS_SISTEMA_MONITOREO-inicial.json', import.meta.url);
const RUTA_PRIMARIA = new URL('./data/NEXUS_SISTEMA_MONITOREO-primaria.json', import.meta.url);
const RUTA_SECUNDARIA = new URL('./data/NEXUS_SISTEMA_MONITOREO-secundaria.json', import.meta.url);
const RUTA_IES = new URL('./data/ies_completas_db.json', import.meta.url);
const RUTA_EBA_EBE_CETPRO = new URL('./data/iiee_eba_ebe_cetpro.json', import.meta.url);
const RUTA_AGP_REAL = new URL('./data/directorio_agp_real.json', import.meta.url);

const AGP_DIRECTORIO_REAL = JSON.parse(readFileSync(RUTA_AGP_REAL, 'utf-8'));

const SUPERADMIN_USER = {
  dni: process.env.SUPERADMIN_DNI || '00000000',
  firstName: process.env.SUPERADMIN_FIRST_NAME || 'Super',
  lastName: process.env.SUPERADMIN_LAST_NAME || 'Administrador',
  email: process.env.SUPERADMIN_EMAIL || 'superadmin@ugel.gob.pe',
  phone: process.env.SUPERADMIN_PHONE || '999999999',
  role: 'superusuario',
};

const DEMO_UGEL_USERS = [
  {
    dni: '40000001',
    firstName: 'Carlos',
    lastName: 'Mendoza Quispe',
    email: 'carlos.mendoza@ugel.gob.pe',
    role: 'director_ugel',
  },
  {
    dni: '40000002',
    firstName: 'Maria Elena',
    lastName: 'Huaman Vargas',
    email: 'maria.huaman@ugel.gob.pe',
    role: 'jefe_gestion',
    nivelEducativo: 'Secundaria',
  },
  {
    dni: '40000003',
    firstName: 'Jose Luis',
    lastName: 'Quispe Mamani',
    email: 'jose.quispe@ugel.gob.pe',
    role: 'jefe_area',
    nivelEducativo: 'Secundaria',
    especialidades: ['Comunicación', 'Matemática', 'Educación para el Trabajo'],
  },
  {
    dni: '40000004',
    firstName: 'Martha',
    lastName: 'Perez',
    email: 'martha.perez@ugel.gob.pe',
    role: 'jefe_area',
    nivelEducativo: 'Primaria',
    especialidades: ['PIP', 'Educación Física'],
  },
  {
    dni: '40000005',
    firstName: 'Sofia',
    lastName: 'Gomez',
    email: 'sofia.gomez@ugel.gob.pe',
    role: 'jefe_area',
    nivelEducativo: 'Inicial',
  },
  {
    dni: '40000006',
    firstName: 'Ana Lucia',
    lastName: 'Ticona Coila',
    email: 'ana.ticona@ugel.gob.pe',
    role: 'especialista',
    nivelEducativo: 'Primaria',
    especialidades: ['Educación Física'],
  },
  {
    dni: '40000007',
    firstName: 'Pedro Pablo',
    lastName: 'Mamani Cruz',
    email: 'pedro.mamani@ugel.gob.pe',
    role: 'especialista',
    nivelEducativo: 'Secundaria',
    especialidades: ['Ciencia y Tecnología'],
  },
  {
    dni: '40000008',
    firstName: 'Lidia',
    lastName: 'Salinas',
    email: 'lidia.salinas@ugel.gob.pe',
    role: 'especialista',
    nivelEducativo: 'Secundaria',
    especialidades: ['Matemática', 'Comunicación', 'Inglés'],
  },
  {
    dni: '40000009',
    firstName: 'Carmen',
    lastName: 'Rios',
    email: 'carmen.rios@ugel.gob.pe',
    role: 'especialista',
    nivelEducativo: 'Inicial',
  },
  {
    dni: '40000100',
    firstName: 'Roberto',
    lastName: 'Chuquimia',
    email: 'roberto.chuquimia@ugel.gob.pe',
    role: 'especialista',
    nivelEducativo: 'Primaria',
    especialidades: ['PIP'],
  },
  {
    dni: '40000101',
    firstName: 'Juliana',
    lastName: 'Huaricallo',
    email: 'juliana.huaricallo@ugel.gob.pe',
    role: 'especialista',
    nivelEducativo: 'Inicial',
  },
];

const norm = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractNumber = (str) => {
  const match = String(str || '').match(/\b\d+\b/);
  return match ? match[0] : null;
};

const normalizarNivel = (nivel) => {
  if (/inicial/i.test(nivel)) return 'Inicial';
  if (/primaria/i.test(nivel)) return 'Primaria';
  if (/secundaria/i.test(nivel)) return 'Secundaria';
  return 'Inicial';
};

const AREAS_SECUNDARIA = [
  { nombre: 'Matemática', patterns: [/MATEMATICA/i] },
  { nombre: 'Comunicación', patterns: [/COMUNICACION/i] },
  { nombre: 'Ciencias Sociales', patterns: [/CIENCIAS SOCIALES/i, /HISTORIA/i, /\bHGE\b/i] },
  { nombre: 'Ciencia y Tecnología', patterns: [/CIENCIA TECNOLOGIA/i, /TECNOLOGIA Y AMBIENTE/i, /\bCTA\b/i, /CIENCIA Y AMBIENTE/i] },
  { nombre: 'Inglés', patterns: [/INGLES/i] },
  { nombre: 'Educación para el Trabajo', patterns: [/EDUCACION PARA EL TRABAJO/i, /\bEPT\b/i, /TALLER/i] },
  { nombre: 'Desarrollo Personal, Ciudadanía y Cívica', patterns: [/DESARROLLO PERSONAL/i, /\bDPCC\b/i, /CIVICA/i, /CIUDADANIA/i] },
  { nombre: 'Arte y Cultura', patterns: [/ARTE Y CULTURA/i, /\bARTE\b/i] },
  { nombre: 'Educación Religiosa', patterns: [/EDUCACION RELIGIOSA/i, /RELIGIOSA/i] },
  { nombre: 'Educación Física', patterns: [/EDUCACION FISICA/i, /ED\. FISICA/i] },
];

const NO_LECTIVAS = ['ATENCION', 'COLEGIADO', 'TUTORIA', 'MATERIALES', 'REFUERZO', 'INVEST'];

function parseEspecialidadesSecundaria(raw) {
  if (!raw || typeof raw !== 'string') {
    return [{ nombre: 'Comunicación', horas: 0, esPrincipal: true }];
  }

  const regex = /(\d+)\s*HRS?\s+([^,]+)/gi;
  const matches = [...raw.matchAll(regex)];
  const mapaHoras = new Map();

  for (const match of matches) {
    const horas = parseInt(match[1], 10);
    const glosa = match[2].trim().toUpperCase();

    if (NO_LECTIVAS.some((ign) => glosa.includes(ign))) {
      continue;
    }

    for (const area of AREAS_SECUNDARIA) {
      if (area.patterns.some((p) => p.test(glosa))) {
        mapaHoras.set(area.nombre, (mapaHoras.get(area.nombre) || 0) + horas);
        break;
      }
    }
  }

  if (mapaHoras.size === 0) {
    const str = raw.toUpperCase();
    let fallbackNombre = 'Comunicación';
    for (const area of AREAS_SECUNDARIA) {
      if (area.patterns.some((p) => p.test(str))) {
        fallbackNombre = area.nombre;
        break;
      }
    }
    return [{ nombre: fallbackNombre, horas: 0, esPrincipal: true }];
  }

  return Array.from(mapaHoras.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, horas], index) => ({
      nombre,
      horas,
      esPrincipal: index === 0,
    }));
}

function parseEspecialidadesPrimaria(rawCargo, rawSpec) {
  const combined = `${rawCargo || ''} ${rawSpec || ''}`.toUpperCase();
  if (combined.includes('FISICA')) {
    return [{ nombre: 'Educacion Fisica', horas: 30, esPrincipal: true }];
  }
  return [{ nombre: 'PIP', horas: 30, esPrincipal: true }];
}

function cargarNexusPersonas() {
  const rawIesEbr = JSON.parse(readFileSync(RUTA_IES, 'utf-8'));
  const rawIesEba = JSON.parse(readFileSync(RUTA_EBA_EBE_CETPRO, 'utf-8'));
  const iesBase = [...rawIesEbr, ...rawIesEba].map((ie) => ({
    codMod: String(ie.codMod),
    normNombre: norm(ie.nombreIE),
    normDistrito: norm(ie.distrito),
    num: extractNumber(ie.nombreIE),
    nivel: normalizarNivel(ie.nivel),
  }));

  const CARGO_PRIORITY = {
    'Director': 100,
    'Subdirector': 90,
    'Coordinador Pedagógico': 80,
    'Jefe de Taller': 70,
    'Jefe de Laboratorio': 70,
    'PIP': 40,
    'Docente de Educacion Fisica': 30,
    'Docente de Aula': 10,
  };

  const nexusFiles = [RUTA_INICIAL, RUTA_PRIMARIA, RUTA_SECUNDARIA];
  const nexusMap = new Map();
  const sinteticasMap = new Map();
  let nextCodMod = 9900001;

  nexusFiles.forEach((fileUrl) => {
    const data = JSON.parse(readFileSync(fileUrl, 'utf-8'));
    data.forEach((r) => {
      let dni = String(r['DOCUMENTO DE IDENTIDAD'] || '').trim().padStart(8, '0');
      if (!dni || dni.length !== 8 || dni === '00000000') return;

      const nombres = String(r['NOMBRES'] || '').trim().toUpperCase();
      const patero = String(r['APELLIDO PATERNO'] || '').trim().toUpperCase();
      const materno = String(r['APELLIDO MATERNO'] || '').trim().toUpperCase();
      const apellidos = `${patero} ${materno}`.trim();
      const rawCargo = String(r['CARGO'] || '').trim().toUpperCase();
      const rawEstado = String(r['ESTADO'] || '').trim().toUpperCase();
      const rawNivel = String(r['NIVEL EDUCATIVO'] || '').trim();
      const rawIE = String(r['NOMBRE DE LA INSTITUCION EDUCATIVA'] || '');
      const rawDist = String(r['DISTRITO'] || '');
      const situacion = String(r['SITUACION LABORAL'] || 'NOMBRADO').trim();
      const jornada = parseInt(r['JORNADA LABORAL']) || 40;
      const especialidadRaw = String(r['ESPECIALIDAD'] || '').trim();

      const normName = norm(rawIE);
      const normDist = norm(rawDist);
      const num = extractNumber(rawIE);
      const levelNorm = normalizarNivel(rawNivel);

      // Match IE (consistente con instituciones.js)
      let found = iesBase.find((ie) => ie.normDistrito === normDist && ie.normNombre === normName);
      if (!found && num) {
        found = iesBase.find((ie) => ie.normDistrito === normDist && ie.nivel === levelNorm && ie.num === num);
      }
      if (!found && num) {
        const candidates = iesBase.filter((ie) => ie.nivel === levelNorm && ie.num === num);
        if (candidates.length === 1) found = candidates[0];
      }
      if (!found) {
        found = iesBase.find(
          (ie) =>
            ie.normDistrito === normDist &&
            ie.nivel === levelNorm &&
            (ie.normNombre.includes(normName) || normName.includes(ie.normNombre)),
        );
      }
      if (!found) {
        found = iesBase.find((ie) => ie.nivel === levelNorm && ie.normNombre === normName);
      }
      if (!found && normName.includes('PRONOEI')) {
        found = iesBase.find((ie) => ie.normNombre.includes('PRONOEI'));
      }
      if (!found && num) {
        found = iesBase.find((ie) => ie.num === num && ie.nivel === levelNorm);
      }

      let codMod = found?.codMod;
      if (!codMod) {
        const key = `${normDist}|${normName}|${levelNorm}`;
        if (!sinteticasMap.has(key)) {
          sinteticasMap.set(key, String(nextCodMod++));
        }
        codMod = sinteticasMap.get(key);
      }

      let role = 'docente';
      let cargoNombre = 'Docente de Aula';

      if (rawCargo === 'DIRECTOR I.E.' || rawEstado.includes('DIRECTOR') || rawEstado.includes('DIRECTIVOS DE I.E')) {
        role = 'director_institucion';
        cargoNombre = 'Director';
      } else if (rawCargo === 'SUB-DIRECTOR I.E.' || rawEstado.includes('SUB-DIRECTOR')) {
        cargoNombre = 'Subdirector';
      } else if (rawCargo.includes('COORDINADOR') || rawEstado.includes('COORDINADOR')) {
        role = 'coordinador_pedagogico';
        cargoNombre = 'Coordinador Pedagógico';
      } else if (rawCargo === 'JEFE DE TALLER') {
        role = 'jefe_taller';
        cargoNombre = 'Jefe de Taller';
      } else if (rawCargo === 'JEFE DE LABORATORIO') {
        cargoNombre = 'Jefe de Laboratorio';
      } else if (rawCargo === 'PROFESOR - IP') {
        cargoNombre = 'PIP';
      } else if (rawCargo.includes('EDUCACION FISICA') || rawCargo.includes('TECNICO DEPORTIVO')) {
        cargoNombre = 'Docente de Educacion Fisica';
      }

      const cargoPrioridad = CARGO_PRIORITY[cargoNombre] || 10;

      let especialidades = [];
      if (levelNorm === 'Primaria') {
        especialidades = parseEspecialidadesPrimaria(rawCargo, especialidadRaw);
      } else if (levelNorm === 'Secundaria') {
        especialidades = parseEspecialidadesSecundaria(especialidadRaw);
      }
      const especialidadPrincipal = especialidades[0]?.nombre || null;

      const cleanFirst = nombres.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
      const cleanLast = patero.toLowerCase().replace(/[^a-z]/g, '');
      const email = `${cleanFirst}.${cleanLast}_${dni.slice(-4)}@ugel.gob.pe`;

      if (!nexusMap.has(dni)) {
        nexusMap.set(dni, {
          dni,
          firstName: nombres,
          lastName: apellidos,
          email,
          role,
          nivelEducativo: levelNorm,
          condicionLaboral: situacion.charAt(0).toUpperCase() + situacion.slice(1).toLowerCase(),
          cargaLaboral: jornada,
          institucionCodigoModular: codMod,
          cargoNombre,
          cargoPrioridad,
          especialidad: especialidadPrincipal,
          especialidades,
        });
      } else {
        const existing = nexusMap.get(dni);
        if (cargoPrioridad > (existing.cargoPrioridad || 0)) {
          existing.role = role;
          existing.institucionCodigoModular = codMod;
          existing.cargoNombre = cargoNombre;
          existing.cargoPrioridad = cargoPrioridad;
          existing.nivelEducativo = levelNorm;
          existing.especialidad = especialidadPrincipal;
          existing.especialidades = especialidades;
          existing.cargaLaboral = jornada;
          existing.condicionLaboral = situacion.charAt(0).toUpperCase() + situacion.slice(1).toLowerCase();
        }
      }
    });
  });

  return Array.from(nexusMap.values());
}

async function limpiarPersonasPrevias() {
  console.log('[personas] Limpiando datos de personas, usuarios y registros anteriores...');
  await prisma.fichaRespuestaEjeItem.deleteMany({});
  await prisma.fichaRespuestaAspecto.deleteMany({});
  await prisma.fichaRespuestaDesempeno.deleteMany({});
  await prisma.fichaContexto.deleteMany({});
  await prisma.fichaMonitoreo.deleteMany({});
  await prisma.solicitudReprogramacion.deleteMany({});
  await prisma.solicitudVisita.deleteMany({});
  await prisma.notificacion.deleteMany({});
  await prisma.cronograma.deleteMany({});
  await prisma.planCoberturaIe.deleteMany({});
  await prisma.planMonitoreo.deleteMany({});
  await prisma.rubricaNivel.deleteMany({});
  await prisma.aspectoEvaluado.deleteMany({});
  await prisma.desempenoPlantilla.deleteMany({});
  await prisma.ejeItemPlantilla.deleteMany({});
  await prisma.nivelCalificacion.deleteMany({});
  await prisma.solicitudPlantillaItem.deleteMany({});
  await prisma.plantillaMonitoreo.deleteMany({});
  await prisma.docenteSeccion.deleteMany({});
  await prisma.docenteCurso.deleteMany({});
  await prisma.docenteCargo.deleteMany({});
  await prisma.docenteEspecialidad.deleteMany({});
  await prisma.docenteArea.deleteMany({});
  await prisma.asignacionEvaluador.deleteMany({});
  await prisma.docente.deleteMany({});
  await prisma.especialistaCargo.deleteMany({});
  await prisma.especialistaEspecialidad.deleteMany({});
  await prisma.especialista.deleteMany({});
  await prisma.sesionAuth.deleteMany({});
  await prisma.tokenRecuperacion.deleteMany({});
  await prisma.logAuditoria.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.persona.deleteMany({});
}

export async function seedPersonas(ctx) {
  const isProduction = Boolean(ctx?.isProduction);
  console.log(
    `[personas] Seeding personas y usuarios (${isProduction ? 'MODO PRODUCCIÓN - Solo datos reales' : 'MODO DESARROLLO - Incluye usuarios demo'})...`,
  );

  await limpiarPersonasPrevias();

  const nexusUsers = cargarNexusPersonas();
  const adminUsers = isProduction ? [SUPERADMIN_USER] : [SUPERADMIN_USER, ...DEMO_UGEL_USERS];
  // Los usuarios reales de AGP se agregan al final para asegurar precedencia de roles sobre plazas de NEXUS
  const todosLosUsuarios = [...adminUsers, ...nexusUsers, ...AGP_DIRECTORIO_REAL];
  console.log(
    `[personas] Total de usuarios a procesar: ${todosLosUsuarios.length} ` +
      `(${adminUsers.length} Admin + ${AGP_DIRECTORIO_REAL.length} AGP Real + ${nexusUsers.length} NEXUS)`,
  );

  const passwordCache = new Map();
  const getPasswordHash = (dni, role) => {
    if (role === 'superusuario' && process.env.SUPERADMIN_PASSWORD) {
      return bcrypt.hashSync(process.env.SUPERADMIN_PASSWORD, 4);
    }
    if (!passwordCache.has(dni)) {
      passwordCache.set(dni, bcrypt.hashSync(dni, 4));
    }
    return passwordCache.get(dni);
  };

  for (const u of todosLosUsuarios) {
    const rolId = ctx.roleMap[u.role];
    if (!rolId) {
      console.warn(`[personas] Rol '${u.role}' no encontrado para DNI ${u.dni}`);
      continue;
    }

    const hash = getPasswordHash(u.dni, u.role);
    const isFirstLogin = u.role === 'superusuario' && process.env.SUPERADMIN_PASSWORD ? false : true;

    const persona = await prisma.persona.upsert({
      where: { dni: u.dni },
      update: {
        nombres: u.firstName,
        apellidos: u.lastName,
        correo: u.email,
        telefono: u.phone || null,
      },
      create: {
        dni: u.dni,
        nombres: u.firstName,
        apellidos: u.lastName,
        correo: u.email,
        telefono: u.phone || null,
      },
    });

    await prisma.usuario.upsert({
      where: { personaId: persona.id },
      update: {
        rolId,
        passwordHash: hash,
        isActive: true,
        isFirstLogin,
      },
      create: {
        personaId: persona.id,
        rolId,
        passwordHash: hash,
        isActive: true,
        isFirstLogin,
      },
    });

    // 1. Especialista UGEL
    if (['especialista', 'jefe_area', 'jefe_gestion', 'director_ugel'].includes(u.role)) {
      const cargoEspecialista =
        u.cargoEspecialista ||
        (u.role === 'jefe_area'
          ? 'Jefe de Área'
          : u.role === 'jefe_gestion'
            ? 'Jefe de Gestión'
            : 'Especialista');

      // El backend rechaza 'Nombrado' para todo el que no sea Jefe de Gestión
      // (especialista.service.ts, Regla 2b): sembrarlo así en todos dejaba a
      // cualquier Especialista o Jefe de Área en un estado que la propia API
      // no deja volver a guardar.
      const condicionLaboral = cargoEspecialista === 'Jefe de Gestión' ? 'Nombrado' : 'Encargado';

      const esp = await prisma.especialista.upsert({
        where: { personaId: persona.id },
        update: {
          cargo: cargoEspecialista,
          nivelEducativo: u.nivelEducativo || 'Secundaria',
          condicionLaboral,
          cargaLaboral: 40,
          estado: 'Activo',
        },
        create: {
          personaId: persona.id,
          cargo: cargoEspecialista,
          nivelEducativo: u.nivelEducativo || 'Secundaria',
          condicionLaboral,
          cargaLaboral: 40,
          estado: 'Activo',
        },
      });

      // Cargo activo en especialista_cargos (Fase 2 de capability-map)
      await prisma.especialistaCargo.deleteMany({
        where: { especialistaId: esp.id },
      });
      await prisma.especialistaCargo.create({
        data: {
          especialistaId: esp.id,
          cargo: cargoEspecialista,
          esPrincipal: true,
          fechaInicio: new Date(),
          fechaFin: null,
        },
      });

      if (u.especialidades && u.especialidades.length > 0) {
        for (const [indice, espNombre] of u.especialidades.entries()) {
          const nivelId = ctx.nivelMap[u.nivelEducativo || 'Secundaria'];
          if (nivelId) {
            const espRecord = await prisma.especialidad.findFirst({
              where: { nombre: espNombre, nivelEducativoId: nivelId },
            });
            if (espRecord) {
              // Solo la primera es la principal; el mapper del backend
              // (`especialista-mapper.helper.ts`) separa principal/extras
              // filtrando por `esPrincipal`, así que marcarlas todas como
              // principal dejaba las extras vacías para el formulario.
              await prisma.especialistaEspecialidad.upsert({
                where: { especialistaId_especialidadId: { especialistaId: esp.id, especialidadId: espRecord.id } },
                update: { esPrincipal: indice === 0 },
                create: { especialistaId: esp.id, especialidadId: espRecord.id, esPrincipal: indice === 0 },
              });
            }
          }
        }
      }
    }

    // 2. Staff Docente / Directivo de IE
    if (['director_institucion', 'coordinador_pedagogico', 'jefe_taller', 'docente'].includes(u.role)) {
      const instId = ctx.instMap[u.institucionCodigoModular];
      if (!instId) {
        console.warn(`[personas] IE con código modular '${u.institucionCodigoModular}' no existe en instMap`);
        continue;
      }

      const nivelDocente = await prisma.nivelEducativo.findFirst({
        where: { codigo: u.nivelEducativo || 'Secundaria', isActive: true },
      });

      const docente = await prisma.docente.upsert({
        where: { personaId: persona.id },
        update: {
          institucionId: instId,
          nivelEducativo: u.nivelEducativo || 'Secundaria',
          nivelEducativoId: nivelDocente?.id ?? null,
          modalidad: 'EBR',
          condicionLaboral: u.condicionLaboral || 'Nombrado',
          cargaLaboral: u.cargaLaboral ?? 40,
          estado: 'Activo',
        },
        create: {
          personaId: persona.id,
          institucionId: instId,
          nivelEducativo: u.nivelEducativo || 'Secundaria',
          nivelEducativoId: nivelDocente?.id ?? null,
          modalidad: 'EBR',
          gradoAcademico: 'Licenciado',
          condicionLaboral: u.condicionLaboral || 'Nombrado',
          cargaLaboral: u.cargaLaboral ?? 40,
          estado: 'Activo',
        },
      });

      const especialidadesList = u.especialidades && u.especialidades.length > 0
        ? u.especialidades
        : u.especialidad
          ? [{ nombre: u.especialidad, esPrincipal: true }]
          : [];

      if (especialidadesList.length > 0 && nivelDocente) {
        for (const espItem of especialidadesList) {
          const espRecord = await prisma.especialidad.findFirst({
            where: { nombre: espItem.nombre, nivelEducativoId: nivelDocente.id },
          });
          if (espRecord) {
            await prisma.docenteEspecialidad.upsert({
              where: { docenteId_especialidadId: { docenteId: docente.id, especialidadId: espRecord.id } },
              update: { esPrincipal: espItem.esPrincipal },
              create: { docenteId: docente.id, especialidadId: espRecord.id, esPrincipal: espItem.esPrincipal },
            });
          }

          const cursoKey = `${espItem.nombre}||${u.nivelEducativo || 'Secundaria'}`;
          const cursoId = ctx.cursoMap[cursoKey];
          if (cursoId) {
            await prisma.docenteCurso.upsert({
              where: { docenteId_cursoId: { docenteId: docente.id, cursoId } },
              update: {},
              create: { docenteId: docente.id, cursoId },
            });
          }
        }
      }

      const cargoNombre = u.cargoNombre || (u.role === 'director_institucion' ? 'Director' : 'Docente de Aula');
      const cargoId = ctx.cargoMap[cargoNombre];
      if (cargoId) {
        const existing = await prisma.docenteCargo.findFirst({ where: { docenteId: docente.id, cargoId } });
        if (!existing) {
          await prisma.docenteCargo.create({
            data: { docenteId: docente.id, cargoId, fechaInicio: new Date() },
          });
        }
      }

      // Sincronizar Especialista para directivos/coordinadores (capacidad de monitorear)
      const isMonitor = ['Director', 'Subdirector', 'Coordinador Pedagógico', 'Jefe de Taller', 'Jefe de Laboratorio'].includes(cargoNombre);
      if (isMonitor) {
        // `u.condicionLaboral` es la del Docente (donde 'Nombrado' es válido y
        // hasta default), no la de este Especialista sincronizado: acá el
        // backend rechaza 'Nombrado' para cualquier cargo que no sea Jefe de
        // Gestión (especialista.service.ts, Regla 2b), y ninguno de estos
        // cargos lo es.
        await prisma.especialista.upsert({
          where: { personaId: persona.id },
          update: {
            cargo: cargoNombre,
            nivelEducativo: u.nivelEducativo || 'Secundaria',
            condicionLaboral: 'Encargado',
            cargaLaboral: u.cargaLaboral ?? 40,
            estado: 'Activo',
            modalidad: 'EBR',
          },
          create: {
            personaId: persona.id,
            cargo: cargoNombre,
            nivelEducativo: u.nivelEducativo || 'Secundaria',
            condicionLaboral: 'Encargado',
            cargaLaboral: u.cargaLaboral ?? 40,
            estado: 'Activo',
            modalidad: 'EBR',
          },
        });
      }
    }
  }

  // Backfill Fase 2: sync EspecialistaCargo y es_principal de DocenteCargo
  const especialistas = await prisma.especialista.findMany({ select: { id: true, cargo: true, createdAt: true } });
  for (const esp of especialistas) {
    const existing = await prisma.especialistaCargo.findFirst({
      where: { especialistaId: esp.id, fechaFin: null },
    });
    if (!existing) {
      await prisma.especialistaCargo.create({
        data: {
          id: randomUUID(),
          especialistaId: esp.id,
          cargo: esp.cargo,
          fechaInicio: esp.createdAt,
          fechaFin: null,
          esPrincipal: true,
        },
      });
    } else {
      await prisma.especialistaCargo.update({
        where: { id: existing.id },
        data: { cargo: esp.cargo, esPrincipal: true, fechaFin: null },
      });
    }
  }

  const prioridad = {
    'Director': 1,
    'Subdirector': 2,
    'Coordinador Pedagógico': 3,
    'Jefe de Taller': 4,
    'Jefe de Laboratorio': 5,
    'PIP': 6,
    'Docente de Educacion Fisica': 7,
    'Docente de Aula': 8,
  };

  const docentesConCargos = await prisma.docente.findMany({
    include: {
      docenteCargos: {
        where: { fechaFin: null },
        include: { cargo: true },
      },
    },
  });
  for (const d of docentesConCargos) {
    if (d.docenteCargos.length === 0) continue;
    await prisma.docenteCargo.updateMany({
      where: { docenteId: d.id },
      data: { esPrincipal: false },
    });
    const sorted = d.docenteCargos
      .slice()
      .sort((a, b) => {
        const pa = prioridad[a.cargo.nombre] ?? 99;
        const pb = prioridad[b.cargo.nombre] ?? 99;
        if (pa !== pb) return pa - pb;
        return b.fechaInicio.getTime() - a.fechaInicio.getTime();
      });
    const principal = sorted[0];
    await prisma.docenteCargo.update({
      where: { id: principal.id },
      data: { esPrincipal: true },
    });
  }

  console.log(`[personas] ${todosLosUsuarios.length} personas sembradas exitosamente con datos reales de NEXUS.`);
}
