import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { IReporteFicha, IReporteResumenIE } from '@sistema-monitoreo/shared-contracts';
import {
  QueryFichasCompletadas,
  ReporteRepository,
  SessionScope,
} from '../repositories/reporte.repository.js';
import type { PaginatedFichas } from '../repositories/reporte.repository.js';
import * as fs from 'fs/promises';
import * as path from 'path';

import { normalizarFiltrosDeReporte } from './filtros-de-reporte.helper.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { MailerService } from '../../../shared/mailer/mailer.service.js';

@Injectable()
export class ReporteService {
  constructor(
    private readonly repository: ReporteRepository,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  async listFichasCompletadas(
    filters: QueryFichasCompletadas,
    session: SessionScope,
  ): Promise<PaginatedFichas> {
    return this.repository.findFichasCompletadas(normalizarFiltrosDeReporte(filters), session);
  }

  async resumenPorIE(anioAcademico: number, session: SessionScope): Promise<IReporteResumenIE[]> {
    return this.repository.findResumenPorIE(anioAcademico, session);
  }

  async analisisDesempenos(filters: QueryFichasCompletadas, session: SessionScope) {
    return this.repository.findAnalisisDesempenos(normalizarFiltrosDeReporte(filters), session);
  }

  async exportarFichaHTML(id: string, session: SessionScope): Promise<string> {
    const ficha = await this.repository.findFichaByIdParaExport(id, session);
    if (!ficha) throw new NotFoundException(`Ficha ${id} no encontrada o sin acceso.`);
    return this.renderHtml(ficha);
  }

  async enviarFichaPorCorreo(
    id: string,
    session: SessionScope,
  ): Promise<{ success: boolean; message: string }> {
    const ficha = await this.prisma.fichaMonitoreo.findUnique({
      where: { id },
      include: {
        cronograma: { include: { evaluado: { include: { persona: true } } } },
      },
    });

    if (!ficha) throw new NotFoundException(`Ficha ${id} no encontrada.`);
    if (ficha.correoEnviado) throw new BadRequestException(`La ficha ${id} ya fue enviada.`);

    const docente = ficha.cronograma.evaluado.persona;
    const email = docente.correo;
    const nombreCompleto = `${docente.nombres} ${docente.apellidos}`;

    if (!email) {
      throw new BadRequestException('El docente evaluado no tiene un correo registrado.');
    }

    const pdfBuffer = await this.exportarFichaPDF(id, session);
    const fileName = `Ficha_Monitoreo_${ficha.id.split('-')[0]}.pdf`;

    await this.mailerService.sendResumenFichaEmail(email, nombreCompleto, pdfBuffer, fileName);

    await this.prisma.fichaMonitoreo.update({
      where: { id },
      data: { correoEnviado: true },
    });

    await this.prisma.logAuditoria.create({
      data: {
        usuarioId: session.id,
        eventType: 'EMAIL_ENVIADO',
        eventDetail: `Correo con PDF enviado exitosamente a ${email} para la ficha ${ficha.id}.`,
      },
    });

    return { success: true, message: 'Correo enviado correctamente' };
  }

  async exportarFichaPDF(id: string, session: SessionScope): Promise<Buffer> {
    const f = await this.repository.findFichaByIdParaExport(id, session);
    if (!f) throw new NotFoundException(`Ficha ${id} no encontrada o sin acceso.`);

    // Mapear al modelo que espera Handlebars
    const data = {
      ficha: {
        anioAcademico: f.anioAcademico,
        nivelLogro: f.nivelLogro,
        puntajeTotal: f.puntajeTotal,
        promedio: f.promedio.toFixed(2),
        estado: f.estado,
        observaciones: f.observaciones || null,
        compromisos: f.compromisos || null,
        sugerencias: f.sugerencias || null,
      },
      institucion: {
        nombre: f.institucionNombre,
        codigoModular: f.institucionCodigoModular,
      },
      docente: {
        nombres: f.evaluadoNombre,
        apellidoPaterno: '',
        apellidoMaterno: '',
        dni: f.evaluadoDni || 'N/A',
        telefono: f.evaluadoTelefono || 'N/A',
      },
      monitor: {
        nombres: f.especialistaNombre,
        apellidoPaterno: '',
        apellidoMaterno: '',
        dni: 'N/A',
      },
      fechaFormat: new Date(f.fechaEjecucion).toLocaleDateString('es-PE'),
      respuestas:
        f.respuestas && f.respuestas.length > 0
          ? f.respuestas.map((r) => ({
              nombre: r.nombre,
              nivel: r.nivel,
              observaciones: r.observaciones || '—',
            }))
          : [],
      firmas: await Promise.all(
        (f.firmas || []).map(async (firma) => {
          let base64 = null;
          if (firma.imagenUrl && firma.imagenUrl.startsWith('/uploads/')) {
            try {
              const filePath = path.join(process.cwd(), firma.imagenUrl);
              const buffer = await fs.readFile(filePath);
              base64 = `data:image/png;base64,${buffer.toString('base64')}`;
            } catch (e) {
              console.error('Error al leer firma local:', e);
            }
          }
          return {
            rolFirmante: firma.rolFirmante,
            firmanteNombre: firma.firmanteNombre,
            fechaFirma: new Date(firma.fechaFirma).toLocaleDateString('es-PE'),
            imagenB64: base64 || firma.imagenUrl,
          };
        }),
      ),
    };

    return this.pdfGenerator.generatePdfFromTemplate('ficha-report', data);
  }

  private renderHtml(f: IReporteFicha): string {
    const fechaFmt = new Date(f.fechaEjecucion).toLocaleString('es-PE');
    const colorPorNivel: Record<string, string> = {
      INICIO: '#ef4444',
      EN_PROCESO: '#f59e0b',
      LOGRO_ESPERADO: '#22c55e',
      LOGRO_DESTACADO: '#3b82f6',
    };
    const color = colorPorNivel[f.nivelLogro] ?? '#6b7280';
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Ficha de Monitoreo - ${f.evaluadoNombre}</title>
<style>
  @page { size: A4; margin: 2cm; }
  @media print { body { background: white; } }
  body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px; }
  .header { border-bottom: 3px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #1e3a8a; margin: 0; font-size: 22px; }
  .header .sub { color: #64748b; font-size: 13px; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .field { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
  .field .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
  .field .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .result { border-radius: 12px; padding: 20px; color: white; text-align: center; background: ${color}; margin-bottom: 24px; }
  .result h2 { margin: 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .result .nivel { font-size: 32px; font-weight: 800; margin: 8px 0; }
  .result .promedio { font-size: 18px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
  .sello { display: inline-block; padding: 6px 12px; background: #1e3a8a; color: white; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; border-radius: 4px; margin-top: 8px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
<div class="header">
  <h1>Ficha de Monitoreo - UGEL Lampa</h1>
  <div class="sub">Sistema de Monitoreo &middot; Generado el ${fechaFmt}</div>
  <div class="sello">CERRADO Y FIRMADO DIGITALMENTE POR LA UGEL</div>
</div>
<div class="grid">
  <div class="field"><div class="label">Institucion Educativa</div><div class="value">${this.escape(f.institucionNombre)}</div></div>
  <div class="field"><div class="label">Codigo Modular</div><div class="value">${this.escape(f.institucionCodigoModular)}</div></div>
  <div class="field"><div class="label">Evaluado</div><div class="value">${this.escape(f.evaluadoNombre)}</div></div>
  <div class="field"><div class="label">Especialista</div><div class="value">${this.escape(f.especialistaNombre)}</div></div>
  <div class="field"><div class="label">Instrumento</div><div class="value">${this.escape(f.instrumento)}</div></div>
  <div class="field"><div class="label">Ano Academico</div><div class="value">${f.anioAcademico}</div></div>
</div>
<div class="result">
  <h2>Nivel de Logro Alcanzado</h2>
  <div class="nivel">${this.escape(f.nivelLogro)}</div>
  <div class="promedio">Promedio: ${f.promedio.toFixed(2)} &middot; Puntaje: ${f.puntajeTotal}</div>
</div>
<div class="footer">
  Documento generado por el Sistema de Monitoreo de la UGEL Lampa.<br/>
  ID Ficha: ${this.escape(f.id)} &middot; Estado: ${this.escape(f.estado)}
</div>
<button class="no-print" style="position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #1e3a8a; color: white; border: none; border-radius: 6px; cursor: pointer;" onclick="window.print()">Imprimir / Guardar PDF</button>
</body>
</html>`;
  }

  private escape(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
