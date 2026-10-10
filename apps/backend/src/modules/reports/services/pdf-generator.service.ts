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

const FOOTER_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; width: 100%; font-family: Arial, sans-serif; font-size: 8px; color: #555; }
    .footer { width: 100%; padding: 0 0.4in; text-align: right; }
  </style>
</head>
<body>
  <div class="footer">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>
</body>
</html>`;

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  // Helper custom de Handlebars
  constructor() {
    handlebars.registerHelper('increment', (value) => parseInt(String(value), 10) + 1);
  }

  async generatePdfFromTemplate(templateName: string, data: any): Promise<Buffer> {
    this.logger.log(`Generando PDF para plantilla ${templateName}`);

    const htmlContent = this.renderTemplate(templateName, data);
    const form = this.buildForm(htmlContent);

    const response = await this.callGotenberg(form);
    return Buffer.from(await response.arrayBuffer());
  }

  private renderTemplate(templateName: string, data: any): string {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'modules',
      'reports',
      'templates',
      `${templateName}.hbs`,
    );
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    return handlebars.compile(templateHtml)(data);
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
