import { Injectable, Logger } from '@nestjs/common';
import handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_GOTENBERG_URL = 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 60_000;

// A4 en pulgadas, que es la unidad que espera Gotenberg.
const PAPER_WIDTH_IN = '8.27';
const PAPER_HEIGHT_IN = '11.7';
const MARGIN_SIDE_IN = '0.4';
const MARGIN_TOP_IN = '0.4';
const MARGIN_BOTTOM_IN = '0.6';

const TEMPLATES_DIR = path.join(process.cwd(), 'src', 'modules', 'reports', 'templates');

const FOOTER_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    html, body { width: 100%; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 8px; color: #64748b; }
    table { width: calc(100% - 0.8in); margin: 0 0.4in; border-collapse: collapse; border-top: 1px solid #cbd5e1; }
    td { padding-top: 4px; }
    td.derecha { text-align: right; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td>UGEL Lampa · Sistema de Monitoreo Pedagógico</td>
      <td class="derecha">Página <span class="pageNumber"></span> de <span class="totalPages"></span></td>
    </tr>
  </table>
</body>
</html>`;

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private logoUgel?: string;
  private logoAgp?: string;

  // Helper custom de Handlebars
  constructor() {
    handlebars.registerHelper('increment', (value) => parseInt(String(value), 10) + 1);
    // Números por valor (nivel 3 == '3') y cualquier otra cosa por igualdad estricta.
    handlebars.registerHelper('eq', (a: unknown, b: unknown) => {
      const na = Number(a);
      const nb = Number(b);
      return Number.isNaN(na) || Number.isNaN(nb) ? a === b : na === nb;
    });
    // Posición (0–100 %) de un promedio dentro de la escala de logro de 1 a 4.
    handlebars.registerHelper('posicionEscala', (promedio: unknown) => {
      const valor = Math.min(4, Math.max(1, Number(promedio)));
      return Number((((valor - 1) / 3) * 100).toFixed(1));
    });
    // 'LOGRO_ESPERADO' -> 'Logro esperado'
    handlebars.registerHelper('humanizar', (value: unknown) => {
      if (typeof value !== 'string' || value === '') return '';
      const texto = value.replaceAll('_', ' ').toLowerCase();
      return texto.charAt(0).toUpperCase() + texto.slice(1);
    });
  }

  async generatePdfFromTemplate(templateName: string, data: any): Promise<Buffer> {
    this.logger.log(`Generando PDF para plantilla ${templateName}`);

    const htmlContent = this.renderTemplate(templateName, data);
    const form = this.buildForm(htmlContent);

    const response = await this.callGotenberg(form);
    return Buffer.from(await response.arrayBuffer());
  }

  private renderTemplate(templateName: string, data: any): string {
    const templateHtml = fs.readFileSync(path.join(TEMPLATES_DIR, `${templateName}.hbs`), 'utf8');
    return handlebars.compile(templateHtml)(this.conImagenes(data));
  }

  private conImagenes(data: object): Record<string, unknown> {
    return { ...data, logoUgel: this.getLogoUgel(), logoAgp: this.getLogoAgp() };
  }

  // Se embebe como data URI para que el HTML sea autocontenido: Gotenberg no tiene por qué
  // alcanzar al frontend ni a internet para resolver imágenes.
  private getLogoUgel(): string {
    this.logoUgel ??= this.imagenEmbebida('logo-ugel-lampa.webp');
    return this.logoUgel;
  }

  private getLogoAgp(): string {
    this.logoAgp ??= this.imagenEmbebida('logo-agp.webp');
    return this.logoAgp;
  }

  private imagenEmbebida(archivo: string): string {
    const bytes = fs.readFileSync(path.join(TEMPLATES_DIR, 'assets', archivo));
    return `data:image/webp;base64,${bytes.toString('base64')}`;
  }

  private buildForm(htmlContent: string): FormData {
    const form = new FormData();
    form.append('files', new Blob([htmlContent], { type: 'text/html' }), 'index.html');
    form.append('files', new Blob([FOOTER_HTML], { type: 'text/html' }), 'footer.html');
    form.append('paperWidth', PAPER_WIDTH_IN);
    form.append('paperHeight', PAPER_HEIGHT_IN);
    form.append('marginTop', MARGIN_TOP_IN);
    form.append('marginBottom', MARGIN_BOTTOM_IN);
    form.append('marginLeft', MARGIN_SIDE_IN);
    form.append('marginRight', MARGIN_SIDE_IN);
    form.append('printBackground', 'true');
    return form;
  }

  private async callGotenberg(form: FormData): Promise<Response> {
    const baseUrl = (process.env.GOTENBERG_URL || DEFAULT_GOTENBERG_URL).replace(/\/+$/, '');

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/forms/chromium/convert/html`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error('No se pudo contactar a Gotenberg', error);
      throw new Error(`No se pudo contactar a Gotenberg en ${baseUrl}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Gotenberg respondió ${response.status}: ${detail}`);
      throw new Error(`Gotenberg respondió ${response.status}`);
    }
    return response;
  }
}
