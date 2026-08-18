// J4 — El especialista registra su firma (dibujándola) y firma una ficha
// finalizada. Se verifica que aparece la firma en la base.
import { chromium } from 'playwright-core';
import { chromiumPath, OUT, WEB, loginWeb, sql } from '../lib.mjs';

export async function run() {
  // Ficha finalizada sin firmar, con su monitor y su docente.
  // El monitor debe poder firmar: el Director de UGEL figura como monitor en
  // datos sembrados pero no tiene el permiso `mi_firma`. Se prioriza la ficha más
  // reciente (la que deja J3), cuyo monitor sí firma.
  const fila = sql(
    `SELECT f.id||'|'||pe.dni||'|'||pd.nombres FROM fichas_monitoreo f
     JOIN cronogramas c ON c.id=f.cronograma_id
     JOIN especialistas e ON e.id=c.monitor_id JOIN personas pe ON pe.id=e.persona_id
     JOIN usuarios ue ON ue.persona_id=pe.id JOIN roles re ON re.id=ue.rol_id
     JOIN docentes d ON d.id=c.evaluado_id JOIN personas pd ON pd.id=d.persona_id
     WHERE f.estado='FINALIZADO' AND (SELECT count(*) FROM ficha_firmas ff WHERE ff.ficha_id=f.id)=0
       AND re.nombre NOT IN ('Director UGEL','Docente')
     ORDER BY f.created_at DESC LIMIT 1`,
  );
  if (!fila) { console.log('RESULT J4-firmar SKIP sin ficha finalizada sin firmar'); return true; }
  const [fichaId, monitorDni, docenteNombre] = fila.split('|');

  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 1000 });
  try {
    await loginWeb(page, monitorDni);

    // 1) Registrar firma dibujando en el canvas.
    await page.goto(WEB + '/mi-firma', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const dibujar = page.getByRole('button', { name: /Dibujar/i });
    if (await dibujar.count()) await dibujar.click();
    await page.waitForTimeout(600);
    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 10000 });
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 20, box.y + box.height / 2);
      await page.mouse.down();
      for (let k = 1; k <= 10; k++) await page.mouse.move(box.x + 20 + (k * (box.width - 40)) / 10, box.y + box.height / 2 + Math.sin(k) * 20);
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Guardar Firma/i }).click();
    await page.waitForTimeout(2000);

    // 2) Abrir la ficha completada y firmar.
    await page.goto(WEB + '/monitoreo/calendario', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /^Lista$/ }).click();
    await page.waitForTimeout(1200);
    const primerNombre = docenteNombre.split(' ')[0];
    const card = page.getByText(new RegExp(primerNombre, 'i')).first()
      .locator('xpath=ancestor::div[.//button[contains(.,"Ver detalles")]][1]');
    await card.getByRole('button', { name: /Ver detalles/i }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Ver Ficha de Monitoreo Llena/i }).click();
    await page.waitForTimeout(2000);
    const firmar = page.getByRole('button', { name: /Firmar Ficha/i }).first();
    if (await firmar.count()) {
      await firmar.click();
      await page.waitForTimeout(1500);
      const conf = page.getByRole('button', { name: /confirmar|firmar|aceptar|sí/i }).last();
      if (await conf.count()) await conf.click().catch(() => {});
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: `${OUT}/j4-firma.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  const firmas = Number(sql(`SELECT count(*) FROM ficha_firmas WHERE ficha_id='${fichaId}'`));
  const ok = firmas >= 1;
  console.log(`RESULT J4-firmar ${ok ? 'PASS' : 'FAIL'} firmas de la ficha=${firmas}`);
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1));
