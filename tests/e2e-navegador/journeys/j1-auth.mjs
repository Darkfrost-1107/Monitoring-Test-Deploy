// J1 — Embudo de autenticación de cada actor: primer login → cambio de
// contraseña obligatorio → aterrizaje en su vista inicial, sin errores.
import { chromium } from 'playwright-core';
import { chromiumPath, OUT, PASSWORD, prepararUsuario, loginWeb, sql } from '../lib.mjs';

// DNIs canónicos por rol. Coordinador y Jefe de Taller no los crea ningún seed:
// se descubren de la base (los crean J5/J6) y, si no existen aún, se omiten.
function actores() {
  const base = [
    { rol: 'director_ugel', dni: '40000001' },
    { rol: 'jefe_gestion', dni: '40000002' },
    { rol: 'jefe_area', dni: '40000003' },
    { rol: 'especialista', dni: '40000004' },
    { rol: 'director_institucion', dni: '40000006' },
    { rol: 'docente', dni: '40000008' },
  ];
  const extra = (rol, nombreRol) => {
    const dni = sql(
      `SELECT p.dni FROM usuarios u JOIN roles r ON r.id=u.rol_id JOIN personas p ON p.id=u.persona_id WHERE r.nombre='${nombreRol}' AND u.is_active LIMIT 1`,
    );
    if (dni) base.push({ rol, dni });
  };
  extra('coordinador_pedagogico', 'Coordinador Pedagógico');
  extra('jefe_taller', 'Jefe de Taller');
  return base;
}

export async function run() {
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  const res = [];
  for (const a of actores()) {
    await prepararUsuario(a.dni);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errores = [];
    page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    const url = await loginWeb(page, a.dni);
    const enLogin = url.includes('/login');
    const enCambio = await page.getByPlaceholder(/Ingrese nueva contraseña/i).count();
    await page.screenshot({ path: `${OUT}/j1_${a.rol}.png`, fullPage: true }).catch(() => {});
    res.push({ rol: a.rol, ok: !enLogin && enCambio === 0 });
    await ctx.close();
  }
  await browser.close();
  const pasaron = res.filter((r) => r.ok).length;
  const ok = pasaron === res.length;
  console.log(`RESULT J1-auth ${ok ? 'PASS' : 'FAIL'} ${pasaron}/${res.length} actores entran`);
  return ok;
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1));
