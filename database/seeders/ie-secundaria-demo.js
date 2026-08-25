import { pathToFileURL } from 'node:url';
import { prisma, disconnect } from './_lib/prisma.js';
import { randomUUID } from 'node:crypto';

/**
 * Lote de monitoreos de una I.E. de Secundaria hechos por SUS propios actores:
 * director, coordinador pedagógico y jefe de taller. Cada actor monitorea con
 * SU(S) plantilla(s): el director tiene la regular y la EIB (y a algunos docentes
 * les aplica ambas en la misma visita), el coordinador la regular y el jefe de
 * taller la EIB. Sirve para ver el comportamiento del Análisis y el Dashboard con
 * plantillas institucionales conviviendo con las de la UGEL.
 *
 * Los DNI de los actores se pasan por env o usan los de la IE JOSE CARLOS
 * MARIATEGUI (9900019). Idempotente por marcador.
 */

const MARKER = 'seed-ie-sec-demo';
const DNIS = (process.env.IE_SEC_DNIS ?? '02171995,02436952,01210765').split(',');

/** PRNG determinista para variedad reproducible. */
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nivelDesdePromedio(p) {
  if (p <= 1.5) return 'INICIO';
  if (p <= 2.5) return 'EN_PROCESO';
  if (p <= 3.5) return 'LOGRO_ESPERADO';
  return 'LOGRO_DESTACADO';
}

const PERFILES = {
  inicio: [0.7, 0.25, 0.05, 0.0],
  proceso: [0.25, 0.45, 0.25, 0.05],
  logro: [0.05, 0.2, 0.45, 0.3],
  destacado: [0.0, 0.05, 0.25, 0.7],
  mixto: [0.25, 0.25, 0.25, 0.25],
};
const CICLO = ['proceso', 'logro', 'inicio', 'destacado', 'mixto', 'logro', 'proceso', 'inicio'];

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

/** Carga los actores con su especialista, usuario, IE y plantillas vigentes propias. */
async function cargarActores() {
  const actores = [];
  for (const dni of DNIS.map((d) => d.trim()).filter(Boolean)) {
    const usuario = await prisma.usuario.findFirst({
      where: { persona: { dni } },
      include: {
        rol: true,
        persona: { include: { especialista: true, docente: true } },
      },
    });
    if (!usuario?.persona?.especialista) {
      console.log(`  - DNI ${dni}: sin especialista (no puede monitorear), saltando.`);
      continue;
    }
    const institucionId = usuario.persona.docente?.institucionId ?? null;
    if (!institucionId) {
      console.log(`  - DNI ${dni}: sin institución, saltando.`);
      continue;
    }
    // Plantillas vigentes creadas por ESTE actor (sus clones).
    const plantillasRaw = await prisma.plantillaMonitoreo.findMany({
      where: { autorId: usuario.id, estado: 'Vigente', deleted: false },
    });
    const plantillas = [];
    for (const p of plantillasRaw) {
      const desempenos = await prisma.desempenoPlantilla.findMany({
        where: { plantillaId: p.id },
        orderBy: { orden: 'asc' },
      });
      plantillas.push({ id: p.id, tipo: p.tipoMonitoreo, desempenos });
    }
    if (plantillas.length === 0) {
      console.log(`  - ${usuario.persona.nombres}: sin plantillas propias vigentes, saltando.`);
      continue;
    }
    // Plan de monitoreo propio (si subió uno), para vincular el cronograma.
    const plan = await prisma.planMonitoreo.findFirst({
      where: { autorId: usuario.id, deleted: false },
      orderBy: { createdAt: 'desc' },
    });
    actores.push({
      dni,
      rol: usuario.rol.codigo,
      nombre: `${usuario.persona.nombres} ${usuario.persona.apellidos}`,
      usuarioId: usuario.id,
      especialistaId: usuario.persona.especialista.id,
      docenteId: usuario.persona.docente?.id ?? null,
      institucionId,
      planId: plan?.id ?? null,
      plantillas,
      nivelEducativo: usuario.persona.docente?.institucionId ? null : null,
    });
  }
  return actores;
}

/** Una visita (cronograma COMPLETADO) con una o varias fichas (regular y/o EIB). */
async function crearVisita({ actor, evaluado, plantillas, numeroVisita, perfil, semilla, nivelEducativo }) {
  const fecha = new Date(2026, (semilla % 6) + 2, ((semilla * 5) % 26) + 1, 10, 0, 0);

  const crono = await prisma.cronograma.create({
    data: {
      id: randomUUID(),
      monitorId: actor.especialistaId,
      institucionId: actor.institucionId,
      evaluadoId: evaluado.id,
      planId: actor.planId,
      tipoMonitoreo: 'DOCENTE', // la EIB también es una visita docente
      numeroVisita,
      fechaProgramada: fecha,
      horaInicio: '08:00:00',
      detalles: MARKER,
      estado: 'COMPLETADO',
      modalidad: 'EBR',
      nivelEducativo,
    },
  });

  // Cada plantilla aplicada es una ficha distinta sobre la MISMA visita
  // (unique cronograma+plantilla permite regular y EIB juntas).
  for (let k = 0; k < plantillas.length; k++) {
    const plantilla = plantillas[k];
    const maxNivel = plantilla.tipo === 'DOCENTE_EIB' ? 3 : 4;
    const rand = prng(semilla * 10 + k);
    const pesos = PERFILES[perfil];
    const nivelesResp = plantilla.desempenos.map(() => elegirNivel(rand, pesos, maxNivel));
    const suma = nivelesResp.reduce((a, b) => a + b, 0);
    const promedio = plantilla.desempenos.length > 0 ? suma / plantilla.desempenos.length : 0;

    const contexto = await prisma.fichaContexto.create({
      data: {
        id: randomUUID(),
        areaCurricular: 'Comunicacion',
        grado: `${(semilla % 5) + 1}.`,
        seccion: ['A', 'B', 'C'][semilla % 3],
        cantidadEstudiantes: 22 + (semilla % 12),
        cantidadEstudiantesNee: semilla % 3,
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
        creadoPorId: actor.usuarioId,
        finalizadaPorId: actor.usuarioId,
        finalizadaAt: fecha,
        observaciones: MARKER,
        sugerencias: 'Fortalecer las estrategias observadas durante la visita.',
        compromisos: 'Aplicar las mejoras acordadas para el próximo monitoreo.',
      },
    });

    await prisma.fichaRespuestaDesempeno.createMany({
      data: plantilla.desempenos.map((d, i) => ({
        id: randomUUID(),
        fichaId: ficha.id,
        desempenoId: d.id,
        nivel: nivelesResp[i],
      })),
    });
  }

  return plantillas.length;
}

export async function seedIeSecundariaDemo() {
  console.log('[ie-sec-demo] Sembrando monitoreos por actores de la I.E. de Secundaria...');

  const ya = await prisma.fichaMonitoreo.count({ where: { observaciones: MARKER } });
  if (ya > 0) {
    console.log(`  - ya existen ${ya} fichas del lote, saltando.`);
    return;
  }

  const actores = await cargarActores();
  if (actores.length === 0) {
    console.log('  - sin actores válidos, nada que sembrar.');
    return;
  }

  const institucionId = actores[0].institucionId;
  const ieDatos = await prisma.institucionEducativa.findUnique({ where: { id: institucionId } });
  const nivelEducativo = ieDatos?.nivelEducativo ?? 'Secundaria';

  // Docentes activos de la I.E. que no son los propios actores.
  const idsActores = new Set(actores.map((a) => a.docenteId).filter(Boolean));
  const docentes = (
    await prisma.docente.findMany({
      where: { institucionId, estado: 'Activo' },
      orderBy: { createdAt: 'asc' },
    })
  ).filter((d) => !idsActores.has(d.id));

  if (docentes.length === 0) {
    console.log('  - la I.E. no tiene docentes evaluables, saltando.');
    return;
  }

  // Perfiles para la 2ª ronda: casi siempre mejor que la 1ª (evolución positiva),
  // así el «Progreso Histórico» sube; alguno se mantiene o baja, para variar.
  const EVOLUCION = { inicio: 'proceso', proceso: 'logro', logro: 'destacado', destacado: 'destacado', mixto: 'logro' };

  let semilla = 1;
  let docenteIdx = 0;
  let total = 0;

  for (const actor of actores) {
    const cuantos = actor.rol === 'director_institucion' ? 8 : 6;
    const tieneEib = actor.plantillas.find((p) => p.tipo === 'DOCENTE_EIB');
    const tieneRegular = actor.plantillas.find((p) => p.tipo === 'DOCENTE');
    let visitasCreadas = 0;

    for (let i = 0; i < cuantos; i++) {
      // Cada actor toma docentes distintos (con solape realista entre actores).
      const evaluado = docentes[docenteIdx % docentes.length];
      docenteIdx += 1;

      // Qué plantilla(s) aplica el actor a ESTE docente:
      //  - director: a 1 de cada 4 le aplica ambas (regular + EIB) en la visita;
      //    al resto alterna entre las suyas.
      //  - coordinador/jefe de taller: su única plantilla.
      let plantillasAplicar;
      if (actor.rol === 'director_institucion' && tieneEib && tieneRegular && i % 4 === 0) {
        plantillasAplicar = [tieneRegular, tieneEib];
      } else {
        plantillasAplicar = [actor.plantillas[i % actor.plantillas.length]];
      }

      // Nº de rondas para este docente: la mitad recibe una 2ª visita, de modo
      // que el histórico muestre evolución. La numeración es SIEMPRE secuencial:
      // ronda 1 = 1er monitoreo, ronda 2 = 2do. Nunca un 2do sin 1ro.
      const rondas = i % 2 === 0 ? 2 : 1;
      let perfil = CICLO[semilla % CICLO.length];

      for (let ronda = 1; ronda <= rondas; ronda++) {
        total += await crearVisita({
          actor,
          evaluado,
          plantillas: plantillasAplicar,
          numeroVisita: ronda,
          perfil,
          semilla: semilla * 100 + ronda,
          nivelEducativo,
        });
        visitasCreadas += 1;
        perfil = EVOLUCION[perfil] ?? perfil; // la siguiente ronda tiende a mejorar
      }
      semilla += 1;
    }
    console.log(
      `  + ${actor.nombre} (${actor.rol}): ${visitasCreadas} visitas, plantillas [${actor.plantillas
        .map((p) => p.tipo)
        .join(', ')}].`,
    );
  }

  console.log(`  = lote ie-sec-demo: ${total} fichas FINALIZADAS creadas.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedIeSecundariaDemo()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => disconnect());
}
