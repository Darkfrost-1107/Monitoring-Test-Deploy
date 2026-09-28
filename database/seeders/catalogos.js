import { prisma } from './_lib/prisma.js';
import { randomUUID } from 'node:crypto';

/**
 * Catalogos transversales: modalidades, niveles educativos, especialidades,
 * areas curriculares, turnos, cursos.
 *
 * Se siembran ANTES de instituciones y personas porque estos dependen
 * de los IDs de niveles y especialidades.
 */

const MODALIDADES = [
  { codigo: 'EBR', nombre: 'Educacion Basica Regular' },
  { codigo: 'EBA', nombre: 'Educacion Basica Alternativa' },
  { codigo: 'EBE', nombre: 'Educacion Basica Especial' },
  { codigo: 'CEPTRO', nombre: 'Centros de Educacion Tecnico-Productiva' },
];

const NIVELES_POR_MODALIDAD = {
  EBR: [
    { codigo: 'Inicial', nombre: 'Inicial' },
    { codigo: 'Primaria', nombre: 'Primaria' },
    { codigo: 'Secundaria', nombre: 'Secundaria' },
  ],
  EBA: [
    { codigo: 'Inicial-Intermedio', nombre: 'Inicial-Intermedio' },
    { codigo: 'Avanzado', nombre: 'Avanzado' },
  ],
  EBE: [
    { codigo: 'CEBE', nombre: 'Centro de Educacion Basica Especial' },
    { codigo: 'PRITE', nombre: 'Programa de Intervencion Temprana' },
  ],
  CEPTRO: [
    { codigo: 'Corte y Ensamblaje', nombre: 'Corte y Ensamblaje' },
    { codigo: 'Mecánica de Motos y Vehículos Afines', nombre: 'Mecánica de Motos y Vehículos Afines' },
    { codigo: 'Peluquería y barbería', nombre: 'Peluquería y barbería' },
    { codigo: 'Fabricación artesanal de productos de madera', nombre: 'Fabricación artesanal de productos de madera' },
    { codigo: 'Plataformas y Servicios de TI', nombre: 'Plataformas y servicios de tecnologías de la información' },
    { codigo: 'Técnico Productiva', nombre: 'Técnico Productiva' },
  ],
};

const ESPECIALIDADES = [
  { nombre: 'PIP', nivel: 'Primaria' },
  { nombre: 'Educación Física', nivel: 'Primaria' },
  { nombre: 'Ciencia y Tecnología', nivel: 'Secundaria' },
  { nombre: 'Matemática', nivel: 'Secundaria' },
  { nombre: 'Comunicación', nivel: 'Secundaria' },
  { nombre: 'Ciencias Sociales', nivel: 'Secundaria' },
  { nombre: 'Desarrollo Personal, Ciudadanía y Cívica', nivel: 'Secundaria' },
  { nombre: 'Arte y Cultura', nivel: 'Secundaria' },
  { nombre: 'Educación Religiosa', nivel: 'Secundaria' },
  { nombre: 'Educación Física', nivel: 'Secundaria' },
  { nombre: 'Inglés', nivel: 'Secundaria' },
  { nombre: 'Educación para el Trabajo', nivel: 'Secundaria' },
];

const CURSOS = [
  { nombre: 'Matematica', nivelEducativo: 'Primaria' },
  { nombre: 'Comunicacion', nivelEducativo: 'Primaria' },
  { nombre: 'Personal Social', nivelEducativo: 'Primaria' },
  { nombre: 'Ciencia y Ambiente', nivelEducativo: 'Primaria' },
  { nombre: 'Educacion Fisica', nivelEducativo: 'Primaria' },
  { nombre: 'Educacion Religiosa', nivelEducativo: 'Primaria' },
  { nombre: 'Arte y Cultura', nivelEducativo: 'Primaria' },
  { nombre: 'Matematica', nivelEducativo: 'Secundaria' },
  { nombre: 'Comunicacion', nivelEducativo: 'Secundaria' },
  { nombre: 'Ingles', nivelEducativo: 'Secundaria' },
  { nombre: 'Ciencia y Tecnología', nivelEducativo: 'Secundaria' },
  { nombre: 'HGE', nivelEducativo: 'Secundaria' },
  { nombre: 'DPCC', nivelEducativo: 'Secundaria' },
  { nombre: 'Educacion Fisica', nivelEducativo: 'Secundaria' },
  { nombre: 'Educacion Religiosa', nivelEducativo: 'Secundaria' },
  { nombre: 'Arte y Cultura', nivelEducativo: 'Secundaria' },
  { nombre: 'EPT', nivelEducativo: 'Secundaria' },
];

export async function seedCatalogos() {
  console.log('[catalogos] Seeding modalidades, niveles, especialidades, cursos...');

  const nivelMap = {};
  const cursoMap = {};

  for (const mod of MODALIDADES) {
    const modalidad = await prisma.modalidad.upsert({
      where: { codigo: mod.codigo },
      update: { nombre: mod.nombre },
      create: { codigo: mod.codigo, nombre: mod.nombre },
    });
    const niveles = NIVELES_POR_MODALIDAD[mod.codigo] || [];
    for (const niv of niveles) {
      const nivel = await prisma.nivelEducativo.upsert({
        where: { codigo_modalidadId: { codigo: niv.codigo, modalidadId: modalidad.id } },
        update: { nombre: niv.nombre },
        create: { codigo: niv.codigo, nombre: niv.nombre, modalidadId: modalidad.id },
      });
      nivelMap[niv.codigo] = nivel.id;
    }
  }

  for (const esp of ESPECIALIDADES) {
    const nivelId = nivelMap[esp.nivel];
    if (!nivelId) {
      console.warn(`[catalogos] Nivel "${esp.nivel}" no existe, saltando especialidad ${esp.nombre}`);
      continue;
    }
    await prisma.especialidad.upsert({
      where: { nombre_nivelEducativoId: { nombre: esp.nombre, nivelEducativoId: nivelId } },
      update: {},
      create: { nombre: esp.nombre, nivelEducativoId: nivelId },
    });
  }

  for (const curso of CURSOS) {
    const nivel = await prisma.nivelEducativo.findFirst({
      where: { codigo: curso.nivelEducativo, isActive: true },
    });
    if (!nivel) {
      console.warn(`[catalogos] Nivel "${curso.nivelEducativo}" no existe, saltando curso ${curso.nombre}`);
      continue;
    }
    const c = await prisma.curso.upsert({
      where: { nombre_nivelEducativoId: { nombre: curso.nombre, nivelEducativoId: nivel.id } },
      update: {},
      create: { nombre: curso.nombre, nivelEducativoId: nivel.id },
    });
    cursoMap[`${curso.nombre}||${curso.nivelEducativo}`] = c.id;
  }

  // Aliases entre Especialidades y Cursos para enlace automático
  if (cursoMap['HGE||Secundaria']) {
    cursoMap['Ciencias Sociales||Secundaria'] = cursoMap['HGE||Secundaria'];
  }
  if (cursoMap['DPCC||Secundaria']) {
    cursoMap['Desarrollo Personal Ciudadania y Civica||Secundaria'] = cursoMap['DPCC||Secundaria'];
  }

  console.log(`[catalogos] ${MODALIDADES.length} modalidades, ${ESPECIALIDADES.length} especialidades, ${CURSOS.length} cursos listos.`);
  return { nivelMap, cursoMap };
}
