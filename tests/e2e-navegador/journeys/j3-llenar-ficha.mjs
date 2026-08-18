// J3 — El especialista continúa una visita EN_PROCESO, valora cada desempeño de
// la rúbrica, escribe las justificaciones/sugerencias/compromisos obligatorios y
// finaliza la ficha. Se verifica que la visita pasa a COMPLETADO y nace la ficha.
import { chromium } from 'playwright-core';
import { chromiumPath, OUT, WEB, loginWeb, sql } from '../lib.mjs';

export async function run() {
  // Descubrir en la base una visita EN_PROCESO y su monitor y docente.
  const fila = sql(
    `SELECT c.id||'|'||pe.dni||'|'||pd.nombres FROM cronogramas c
     JOIN especialistas e ON e.id=c.monitor_id JOIN personas pe ON pe.id=e.persona_id
     JOIN docentes d ON d.id=c.evaluado_id JOIN personas pd ON pd.id=d.persona_id
     WHERE c.estado='EN_PROCESO' LIMIT 1`,
  );
  if (!fila) { console.log('RESULT J3-llenar-ficha SKIP sin visita EN_PROCESO en la base'); return true; }
  const [visitaId, monitorDni, docenteNombre] = fila.split('|');
  const fichasAntes = Number(sql('SELECT count(*) FROM fichas_monitoreo'));

  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 1000 });
  try {
    await loginWeb(page, monitorDni);
    await page.goto(WEB + '/monitoreo/calendario', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /^Lista$/ }).click();
    await page.waitForTimeout(1200);
    const primerNombre = docenteNombre.split(' ')[0];
    const card = page.getByText(new RegExp(primerNombre, 'i')).first()
      .locator('xpath=ancestor::div[.//button[contains(.,"Ver detalles")]][1]');
    await card.getByRole('button', { name: /Ver detalles/i }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /Continuar Monitoreo/i }).click();
    await page.waitForTimeout(1800);

    // Contexto del aula.
    const fill = async (ph, v) => { const l = page.getByPlaceholder(ph).first(); if (await l.count()) await l.fill(v); };
    await fill(/Ej\. 2/, '2°');
    await fill(/Ej\. A/, 'A');
    const nums = page.locator('input[type="number"], input[placeholder="0"]');
    if (await nums.count()) { await nums.nth(0).fill('20'); if (await nums.count() > 1) await nums.nth(1).fill('1'); }

    // Valorar cada desempeño (Nivel III) + justificación obligatoria por rúbrica.
    const total = await page.getByText(/^Valoración:/).count();
    for (let i = 0; i < total; i++) {
      const item = page.getByText(/^Valoración:/).nth(i).locator('xpath=ancestor::*[self::div or self::button][1]');
      await item.scrollIntoViewIfNeeded();
      await item.click();
      await page.waitForTimeout(600);
      // El heading real es "Nivel III" (el "NIVEL III" visible es CSS uppercase);
      // hay copias en la tabla imprimible oculta, así que se clickea el visible.
      const ok = await page.evaluate(() => {
        const els = [...document.querySelectorAll('span,h3,h4,div')].filter(
          (e) => (e.textContent || '').trim() === 'Nivel III' && e.offsetParent !== null);
        if (!els[0]) return false;
        els[0].scrollIntoView({ block: 'center' }); els[0].click(); return true;
      });
      if (!ok) throw new Error('no se pudo seleccionar Nivel III');
      await page.waitForTimeout(300);
      const obs = page.getByPlaceholder(/observaciones o evidencias/i).first();
      await obs.fill('Se observa un desempeño satisfactorio; el docente evidencia la conducta esperada.');
      await page.waitForTimeout(200);
    }

    // Sección III: narrativa + sugerencias (obligatoria) + compromisos.
    const fillTa = async (ph, v) => { const l = page.getByPlaceholder(ph).first(); if (await l.count()) { await l.scrollIntoViewIfNeeded(); await l.fill(v); } };
    await fillTa(/cómo se desarrolló la visita/i, 'La visita se desarrolló con normalidad y apertura al acompañamiento.');
    await fillTa(/aquí las sugerencias/i, 'Continuar fortaleciendo las estrategias de participación activa.');
    await fillTa(/aquí los compromisos/i, 'El docente se compromete a incorporar preguntas de mayor demanda cognitiva.');

    await page.getByRole('button', { name: /Finalizar Monitoreo/i }).click();
    await page.waitForTimeout(1200);
    const conf = page.getByRole('button', { name: /confirmar|sí|aceptar|finalizar/i }).last();
    if (await conf.count()) await conf.click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/j3-ficha.png`, fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  const estado = sql(`SELECT estado FROM cronogramas WHERE id='${visitaId}'`);
  const fichasDespues = Number(sql('SELECT count(*) FROM fichas_monitoreo'));
  const ok = estado === 'COMPLETADO' && fichasDespues === fichasAntes + 1;
  console.log(`RESULT J3-llenar-ficha ${ok ? 'PASS' : 'FAIL'} visita=${estado} fichas ${fichasAntes}→${fichasDespues}`);
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1));
