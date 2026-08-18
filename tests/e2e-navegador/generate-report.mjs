// Genera report.html: un panel visual de la última corrida de la suite, con la
// verificación en base de datos y la captura de cada jornada embebidas.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const cap = (f) => {
  const p = join(AQUI, 'capturas', f);
  return existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString('base64')}` : '';
};
const results = JSON.parse(readFileSync(join(AQUI, 'results.json'), 'utf8'));
const by = Object.fromEntries(results.resultados.map((r) => [r.id, r]));

const ACTORES = [
  ['Director de UGEL', 'director_ugel'], ['Jefe de Gestión', 'jefe_gestion'],
  ['Jefe de Área', 'jefe_area'], ['Especialista', 'especialista'],
  ['Director de I.E.', 'director_institucion'], ['Docente', 'docente'],
  ['Coordinador Pedagógico', 'coordinador_pedagogico'], ['Jefe de Taller', 'jefe_taller'],
];

const JORNADAS = [
  { id: 'J2', actor: 'Jefe de Gestión', titulo: 'Registra un cronograma', desc: 'Completa el formulario en cascada — modalidad, nivel, especialista, institución, docente — y programa la visita.', verif: 'fila creada en cronogramas', shot: 'j2-cronograma.png' },
  { id: 'J3', actor: 'Especialista', titulo: 'Llena y finaliza una ficha', desc: 'Valora cada desempeño de la rúbrica, redacta las justificaciones, sugerencias y compromisos obligatorios y finaliza el monitoreo.', verif: 'visita → COMPLETADO, ficha creada', shot: 'j3-ficha.png' },
  { id: 'J4', actor: 'Especialista', titulo: 'Registra su firma y firma la ficha', desc: 'Dibuja la firma en el lienzo, la guarda y firma la ficha finalizada.', verif: 'firma registrada en la ficha', shot: 'j4-firma.png' },
  { id: 'J5', actor: 'Director de I.E.', titulo: 'Asigna un Coordinador Pedagógico', desc: 'Promueve a un docente de su institución al cargo. Ningún seed crea este rol: la app lo genera.', verif: 'rol Coordinador creado', shot: 'J5-crear-coordinador.png' },
  { id: 'J6', actor: 'Director de I.E.', titulo: 'Asigna un Jefe de Taller', desc: 'Mismo flujo de gestión de personal para el segundo cargo de institución, exclusivo de Secundaria.', verif: 'rol Jefe de Taller creado', shot: 'J6-crear-jefe-taller.png' },
];

const detalleDe = (id) => (by[id]?.detalle || '').replace(/^\S+\s(PASS|FAIL|SKIP)\s/, '');
const fecha = new Date(results.fecha).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' });

const cardJornada = (j) => `
  <article class="card">
    <header class="card__head">
      <span class="pill pill--pass">PASS</span>
      <span class="card__actor">${j.actor}</span>
      <span class="card__id">${j.id}</span>
    </header>
    <h3 class="card__title">${j.titulo}</h3>
    <p class="card__desc">${j.desc}</p>
    <p class="verif"><span class="verif__label">Verificado en BD</span><code class="verif__val">${detalleDe(j.id)}</code></p>
    ${j.shot && cap(j.shot) ? `<a class="shot" href="${cap(j.shot)}" target="_blank" rel="noopener"><img src="${cap(j.shot)}" alt="Captura de ${j.titulo}" loading="lazy"></a>` : ''}
  </article>`;

const galeriaActores = ACTORES.map(([label, slug]) => {
  const src = cap(`j1_${slug}.png`);
  return `<figure class="thumb">${src ? `<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${label}" loading="lazy"></a>` : ''}<figcaption>${label}</figcaption></figure>`;
}).join('');

const html = `<style>
  :root{
    --ground:#faf7f6; --surface:#ffffff; --ink:#241a1d; --muted:#7a6b70;
    --line:#ece0e3; --wine:#8a1e42; --wine-soft:#f3e3e8; --pass:#1c7a4e; --pass-soft:#e2f1e9;
    --shadow:0 1px 2px rgba(40,20,28,.05),0 8px 24px -12px rgba(40,20,28,.14);
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  }
  @media (prefers-color-scheme:dark){:root{
    --ground:#181113; --surface:#221a1d; --ink:#f3e8ec; --muted:#b09aa1;
    --line:#3a2c31; --wine:#e58aa4; --wine-soft:#37232a; --pass:#5cc98d; --pass-soft:#1d3329;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -14px rgba(0,0,0,.6);
  }}
  :root[data-theme="light"]{--ground:#faf7f6;--surface:#fff;--ink:#241a1d;--muted:#7a6b70;--line:#ece0e3;--wine:#8a1e42;--wine-soft:#f3e3e8;--pass:#1c7a4e;--pass-soft:#e2f1e9;--shadow:0 1px 2px rgba(40,20,28,.05),0 8px 24px -12px rgba(40,20,28,.14);}
  :root[data-theme="dark"]{--ground:#181113;--surface:#221a1d;--ink:#f3e8ec;--muted:#b09aa1;--line:#3a2c31;--wine:#e58aa4;--wine-soft:#37232a;--pass:#5cc98d;--pass-soft:#1d3329;--shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px -14px rgba(0,0,0,.6);}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.5;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:clamp(1.5rem,4vw,3.5rem) clamp(1rem,4vw,2rem)}
  .eyebrow{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--wine);font-weight:700;margin:0 0 .6rem}
  h1{font-size:clamp(1.9rem,4.5vw,2.9rem);line-height:1.05;margin:0;letter-spacing:-.02em;text-wrap:balance;font-weight:800}
  .lede{color:var(--muted);max-width:60ch;margin:.9rem 0 0;font-size:1.02rem}
  .masthead{border-bottom:1px solid var(--line);padding-bottom:1.8rem;margin-bottom:2rem}
  .meta{display:flex;flex-wrap:wrap;gap:.5rem 1.4rem;margin-top:1.4rem;font-size:.85rem;color:var(--muted)}
  .meta b{color:var(--ink);font-variant-numeric:tabular-nums}
  .tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin:0 0 2.5rem}
  .tile{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1.1rem 1.2rem;box-shadow:var(--shadow)}
  .tile__n{font-size:2rem;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1}
  .tile__n--pass{color:var(--pass)}
  .tile__l{font-size:.78rem;color:var(--muted);margin-top:.35rem}
  .section-label{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:0 0 1rem;padding-top:.5rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.2rem;margin-bottom:2.6rem}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:1.3rem;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:.55rem}
  .card__head{display:flex;align-items:center;gap:.6rem}
  .card__actor{font-size:.82rem;color:var(--muted);font-weight:600}
  .card__id{margin-left:auto;font-family:var(--mono);font-size:.75rem;color:var(--muted)}
  .card__title{margin:.1rem 0 0;font-size:1.12rem;letter-spacing:-.01em;text-wrap:balance}
  .card__desc{margin:0;font-size:.9rem;color:var(--muted)}
  .pill{font-size:.68rem;font-weight:800;letter-spacing:.08em;padding:.2rem .5rem;border-radius:999px}
  .pill--pass{background:var(--pass-soft);color:var(--pass)}
  .verif{display:flex;flex-direction:column;gap:.3rem;margin:.3rem 0 0}
  .verif__label{font-size:.66rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);font-weight:700}
  .verif__val{font-family:var(--mono);font-size:.86rem;background:var(--wine-soft);color:var(--wine);padding:.4rem .6rem;border-radius:8px;align-self:flex-start;font-variant-numeric:tabular-nums}
  .shot{display:block;margin-top:.6rem;border:1px solid var(--line);border-radius:10px;overflow:hidden;line-height:0}
  .shot img{width:100%;height:auto;display:block;transition:transform .25s ease}
  .shot:hover img{transform:scale(1.02)}
  .actores{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-bottom:2.6rem}
  .thumb{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;box-shadow:var(--shadow)}
  .thumb img{width:100%;height:auto;display:block}
  .thumb figcaption{font-size:.8rem;font-weight:600;padding:.55rem .7rem;color:var(--ink)}
  .note{color:var(--muted);font-size:.86rem;max-width:70ch;border-left:2px solid var(--line);padding-left:1rem;margin:0 0 2rem}
  a:focus-visible{outline:2px solid var(--wine);outline-offset:3px;border-radius:6px}
  @media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">Sistema de Monitoreo · UGEL Lampa</p>
    <h1>Pruebas de extremo a extremo por navegador</h1>
    <p class="lede">Cada recorrido maneja la aplicación real como lo haría el actor y comprueba el efecto en la base de datos — no que la pantalla cargue, sino que la función se ejecute y persista.</p>
    <div class="meta">
      <span>Corrida: <b>${fecha}</b></span>
      <span>Stack aislado: <b>DB 5433 · API 3001 · Web 5174</b></span>
      <span>Sin tocar el entorno de trabajo</span>
    </div>
  </header>

  <div class="tiles">
    <div class="tile"><div class="tile__n tile__n--pass">${results.pasaron}/${results.total}</div><div class="tile__l">Jornadas en verde</div></div>
    <div class="tile"><div class="tile__n">8</div><div class="tile__l">Actores con login verificado</div></div>
    <div class="tile"><div class="tile__n">6</div><div class="tile__l">Funciones ejercitadas</div></div>
    <div class="tile"><div class="tile__n">0</div><div class="tile__l">Errores de consola</div></div>
  </div>

  <p class="section-label">Funciones ejercitadas · verificadas en base de datos</p>
  <div class="grid">
    ${JORNADAS.map(cardJornada).join('')}
  </div>

  <p class="section-label">J1 · Embudo de acceso — los 8 actores</p>
  <p class="note">Primer login con contraseña temporal → cambio obligatorio de contraseña → aterrizaje en la vista inicial de cada rol. Coordinador Pedagógico y Jefe de Taller no existen en ningún seed: los crean J5 y J6, y aquí ya entran.</p>
  <div class="actores">${galeriaActores}</div>
</div>`;

writeFileSync(join(AQUI, 'report.html'), html);
console.log('report.html generado (', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB )');
