import { pathToFileURL } from 'node:url';
import { prisma, disconnect } from './_lib/prisma.js';
import { randomUUID } from 'node:crypto';

/**
 * Lote de fichas FINALIZADAS variadas para ver el comportamiento del Análisis
 * de Desempeño y el Dashboard con las 3 rúbricas (Docente, Docente EIB y
 * Directivo) sobre EBR Inicial, Primaria y Secundaria.
 *
 * A diferencia de los otros lotes, acá el nivel se varía DESEMPEÑO POR DESEMPEÑO
 * según un «perfil» por ficha (bajo/medio/alto/mixto), de modo que el desglose
 * por criterio muestre distribución real y no una columna plana. Ni todo bien ni
 * todo mal: la mezcla de perfiles reparte los niveles de logro.
 *
 * Idempotente: si ya existen fichas con el marcador, no vuelve a sembrar.
 */

const MARKER = 'seed-analisis-demo';
const NIVELES = ['Inicial', 'Primaria', 'Secundaria'];

/** Cuántas fichas por nivel educativo, por instrumento. Total ≈ 51. */
const PLAN = [
  { tipo: 'DOCENTE', porNivel: 8 },
  { tipo: 'DOCENTE_EIB', porNivel: 5 },
  { tipo: 'DIRECTIVO', porNivel: 4 },
];

/** PRNG determinista (mulberry32): variedad reproducible entre corridas. */
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bandas del baremo (EDU-0009), inclusivas. */
function nivelDesdePromedio(p) {
  if (p <= 1.5) return 'INICIO';
  if (p <= 2.5) return 'EN_PROCESO';
  if (p <= 3.5) return 'LOGRO_ESPERADO';
  return 'LOGRO_DESTACADO';
}

/**
 * Pesos por nivel [I, II, III, IV] según el perfil de la ficha. Los perfiles son
 * marcados a propósito: el promedio de varios desempeños tiende al centro, así
 * que para que el nivel de logro global caiga en las 4 bandas (y el dashboard
 * muestre focos de atención y destacados) los extremos deben ser fuertes.
 */
const PERFILES = {
  inicio: [0.7, 0.25, 0.05, 0.0],
  proceso: [0.25, 0.45, 0.25, 0.05],
  logro: [0.05, 0.2, 0.45, 0.3],
  destacado: [0.0, 0.05, 0.25, 0.7],
  mixto: [0.25, 0.25, 0.25, 0.25],
};
const CICLO_PERFIL = [
  'proceso',
  'logro',
  'inicio',
  'destacado',
  'mixto',
  'logro',
  'proceso',
  'destacado',
  'inicio',
  'mixto',
];

/** Elige un nivel 1..maxNivel según los pesos del perfil (recortados y renormalizados). */
function elegirNivel(rand, pesos, maxNivel) {
  const w = pesos.slice(0, maxNivel);
  const suma = w.reduce((a, b) => a + b, 0);
  let r = rand() * suma;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r <= 0) return i + 1;
  }
  return w.length;
}

async function plantillaVigente(tipo) {
  const plantilla = await prisma.plantillaMonitoreo.findFirst({
    where: { tipoMonitoreo: tipo, estado: 'Vigente', institucionId: null, deleted: false },
    orderBy: { version: 'desc' },
  });
  if (!plantilla) return null;
  const desempenos = await prisma.desempenoPlantilla.findMany({
    where: { plantillaId: plantilla.id },
    orderBy: { orden: 'asc' },
  });
  return { plantilla, desempenos };
}

/** Evaluados candidatos por instrumento y nivel (docentes; directivos por cargo). */
async function evaluados(tipo, nivel, cantidad) {
  const baseIE = {
    estado: 'Activa',
    modalidad: 'EBR',
    nivelEducativo: { equals: nivel, mode: 'insensitive' },
  };
  const where =
    tipo === 'DIRECTIVO'
      ? {
          estado: 'Activo',
          institucion: baseIE,
          docenteCargos: {
            some: {
              cargo: {
                nombre: { in: ['Director', 'Subdirector', 'Coordinador Pedagógico', 'Jefe de Taller'] },
              },
            },
          },
        }
      : { estado: 'Activo', institucion: baseIE };

  // Se prioriza a los que tienen coordenadas (para que el mapa/focos también se
  // pueble) y se toma de más para poder diversificar por institución.
  const docentes = await prisma.docente.findMany({
    where,
    include: { institucion: { select: { id: true, latitud: true } } },
    orderBy: { createdAt: 'asc' },
    take: 400,
  });
  docentes.sort((a, b) => (b.institucion?.latitud ? 1 : 0) - (a.institucion?.latitud ? 1 : 0));

  // Una IE por docente para diversificar; si faltan, se permite repetir IE.
  const elegidos = [];
  const iesVistas = new Set();
  for (const d of docentes) {
    if (iesVistas.has(d.institucionId)) continue;
    iesVistas.add(d.institucionId);
    elegidos.push(d);
    if (elegidos.length >= cantidad) break;
  }
  if (elegidos.length < cantidad) {
    for (const d of docentes) {
      if (elegidos.includes(d)) continue;
      elegidos.push(d);
      if (elegidos.length >= cantidad) break;
    }
  }
  return elegidos;
}

async function crearFicha({ tipo, nivel, plantilla, desempenos, evaluado, monitor, numeroVisita, perfil, indice }) {
  const maxNivel = tipo === 'DOCENTE_EIB' ? 3 : 4; // EIB es tripartita: No/Parcial/Sí.
  const rand = prng(indice * 1000 + 7);
  const pesos = PERFILES[perfil];

  const nivelesResp = desempenos.map(() => elegirNivel(rand, pesos, maxNivel));
  const suma = nivelesResp.reduce((a, b) => a + b, 0);
  const promedio = desempenos.length > 0 ? suma / desempenos.length : 0;
  const fecha = new Date(2026, (indice % 6) + 2, ((indice * 7) % 26) + 1, 10, 0, 0);

  const contexto = await prisma.fichaContexto.create({
    data: {
      id: randomUUID(),
      areaCurricular: tipo === 'DIRECTIVO' ? 'Gestión Directiva' : 'Comunicacion',
      grado: tipo === 'DIRECTIVO' ? '—' : `${(indice % 5) + 1}.`,
      seccion: ['A', 'B', 'C'][indice % 3],
      cantidadEstudiantes: 20 + (indice % 15),
      cantidadEstudiantesNee: indice % 3,
    },
  });

  const crono = await prisma.cronograma.create({
    data: {
      id: randomUUID(),
      monitorId: monitor.id,
      institucionId: evaluado.institucionId,
      evaluadoId: evaluado.id,
      planId: null,
      tipoMonitoreo: tipo === 'DOCENTE_EIB' ? 'DOCENTE' : tipo,
      numeroVisita,
      fechaProgramada: fecha,
      horaInicio: '08:00:00',
      detalles: MARKER,
      estado: 'COMPLETADO',
      modalidad: 'EBR',
      nivelEducativo: nivel,
    },
  });

  const ficha = await prisma.fichaMonitoreo.create({
    data: {
      id: randomUUID(),
      cronogramaId: crono.id,
      plantillaId: plantilla.id,
      fichaContextoId: contexto.id,
      anioAcademico: 2026,
      puntajeTotal: suma,
      promedio: promedio.toFixed(2),
      nivelLogro: nivelDesdePromedio(promedio),
      estado: 'FINALIZADO',
      creadoPorId: monitor.usuarioId,
      finalizadaPorId: monitor.usuarioId,
      finalizadaAt: fecha,
      observaciones: MARKER,
      sugerencias: 'Fortalecer las estrategias observadas durante la visita.',
      compromisos: 'Aplicar las mejoras acordadas para el próximo monitoreo.',
    },
  });

  await prisma.fichaRespuestaDesempeno.createMany({
    data: desempenos.map((d, i) => ({
      id: randomUUID(),
      fichaId: ficha.id,
      desempenoId: d.id,
      nivel: nivelesResp[i],
    })),
  });

  return ficha;
}

export async function seedAnalisisDemo() {
  console.log('[analisis-demo] Sembrando lote variado para Análisis y Dashboard...');

  const yaExiste = await prisma.fichaMonitoreo.count({ where: { observaciones: MARKER } });
  if (yaExiste > 0) {
    console.log(`  - ya existen ${yaExiste} fichas del lote, saltando.`);
    return;
  }

  const monitoresRaw = await prisma.especialista.findMany({
    include: { persona: { include: { usuario: { select: { id: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  const monitores = monitoresRaw
    .filter((m) => m.persona?.usuario?.id)
    .map((m) => ({ id: m.id, usuarioId: m.persona.usuario.id }));
  if (monitores.length === 0) {
    console.log('  - sin especialistas con usuario, saltando.');
    return;
  }

  let total = 0;
  let indice = 0;
  let monitorIdx = 0;

  for (const { tipo, porNivel } of PLAN) {
    const info = await plantillaVigente(tipo);
    if (!info) {
      console.log(`  - sin plantilla vigente ${tipo}, saltando ese instrumento.`);
      continue;
    }
    for (const nivel of NIVELES) {
      const candidatos = await evaluados(tipo, nivel, porNivel);
      if (candidatos.length === 0) {
        console.log(`  - ${tipo} ${nivel}: sin evaluados, saltando.`);
        continue;
      }
      let creadas = 0;
      for (let i = 0; i < porNivel; i++) {
        const evaluado = candidatos[i % candidatos.length];
        const monitor = monitores[monitorIdx % monitores.length];
        monitorIdx += 1;
        const perfil = CICLO_PERFIL[indice % CICLO_PERFIL.length];
        // El N° de monitoreo se varía para poblar ese filtro.
        const numeroVisita = (indice % 3) + 1;
        await crearFicha({
          tipo,
          nivel,
          plantilla: info.plantilla,
          desempenos: info.desempenos,
          evaluado,
          monitor,
          numeroVisita,
          perfil,
          indice,
        });
        indice += 1;
        creadas += 1;
        total += 1;
      }
      console.log(`  + ${tipo} ${nivel}: ${creadas} fichas FINALIZADAS.`);
    }
  }

  console.log(`  = lote análisis-demo: ${total} fichas creadas.`);
}

// Permite correr sólo este lote: `node --import tsx database/seeders/analisis-demo.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedAnalisisDemo()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => disconnect());
}
