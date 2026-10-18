'use strict';

/**
 * Build del frontend FinFTech.
 *
 * Toma las pantallas aprobadas exportadas de Stitch y genera las pÃƒÂ¡ginas de la
 * aplicaciÃƒÂ³n conservando el shell (sidebar + header) y la identidad visual:
 *   - unifica la marca a "FinFTech" (elimina "ChaosCore");
 *   - reescribe la navegaciÃƒÂ³n del sidebar a las rutas reales;
 *   - etiqueta el body con data-page para el runtime;
 *   - inyecta los assets funcionales (config, api, ui, pÃƒÂ¡ginas, app).
 *
 * El contenido dinÃƒÂ¡mico lo renderiza el runtime (assets/js) contra la API real.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '_stitch_source', 'stitch_finftech_testing_console');
const OUT = path.resolve(__dirname, 'public');

const PAGES = [
  { file: 'index.html', src: 'performance_overview_finftech_desktop_saas', page: 'dashboard' },
  { file: 'dashboard.html', src: 'performance_overview_finftech_desktop_saas', page: 'dashboard' },
  { file: 'test-lab.html', src: 'test_lab_finftech', page: 'test-lab' },
  { file: 'live-runs.html', src: 'live_runs_finftech', page: 'live-runs' },
  { file: 'history.html', src: 'history_reports_finftech', page: 'history' },
  { file: 'settings.html', src: 'settings_finftech', page: 'settings' },
  { file: 'sign-in.html', src: 'sign_in_finftech_console', page: 'sign-in' },
  { file: 'sign-up.html', src: 'sign_up_onboarding_finftech', page: 'sign-up' },
  { file: 'profile.html', src: 'profile_team_settings_finftech', page: 'profile' },
];

const NAV = {
  dashboard: 'dashboard.html',
  science: 'test-lab.html',
  monitoring: 'live-runs.html',
  description: 'history.html',
  settings: 'settings.html',
  person: 'profile.html',
  group: 'profile.html',
};

function fixBrand(html) {
  return html
    .replace(/ChaosCore's/g, "FinFTech's")
    .replace(/ChaosCore Console/g, 'FinFTech Console')
    .replace(/ChaosCore/g, 'FinFTech');
}

/** Reescribe href="#" del sidebar segÃƒÂºn el icono (token de Material Symbols) que contiene el enlace. */
function rewireNav(html) {
  const asideMatch = html.match(/<aside[\s\S]*?<\/aside>/);
  if (!asideMatch) return html;
  const aside = asideMatch[0];
  const rewritten = aside.replace(/<a\s+([^>]*?)href="#"([^>]*)>([\s\S]*?)<\/a>/g, (whole, pre, post, inner) => {
    const icon = (inner.match(/material-symbols-outlined[^>]*>\s*([a-z_]+)\s*</) || [])[1];
    const target = NAV[icon];
    if (!target) return whole;
    return `<a ${pre}href="${target}"${post}>${inner}</a>`;
  });
  // Enlace de perfil / usuario en el sidebar (si existe)
  const withProfile = rewritten.replace(
    /<a\s+([^>]*?)href="#"([^>]*)>((?:(?!<\/a>)[\s\S])*?(?:Profile|profile)(?:(?!<\/a>)[\s\S])*?)<\/a>/g,
    (whole, pre, post, inner) => `<a ${pre}href="profile.html"${post}>${inner}</a>`
  );
  return html.replace(aside, withProfile);
}

function tagBody(html, page) {
  return html.replace(/<body([^>]*)>/, (m, attrs) => `<body${attrs} data-page="${page}">`);
}

function injectAssets(html) {
  let out = html;
  if (!out.includes('assets/css/finftech.css')) {
    out = out.replace('</head>', '  <link rel="stylesheet" href="assets/css/finftech.css"/>\n</head>');
  }
  const scripts = [
    '<script src="assets/js/config.js"></script>',
    '<script src="assets/js/api.js"></script>',
    '<script src="assets/js/ui.js"></script>',
    '<script src="assets/js/pages.js"></script>',
    '<script src="assets/js/app.js"></script>',
  ].join('\n  ');
  if (!out.includes('assets/js/app.js')) {
    out = out.replace('</body>', `  ${scripts}\n</body>`);
  }
  return out;
}

function build() {
  fs.mkdirSync(OUT, { recursive: true });
  const built = [];
  for (const spec of PAGES) {
    const source = path.join(SRC, spec.src, 'code.html');
    if (!fs.existsSync(source)) {
      console.warn(`  ! falta el origen: ${source}`);
      continue;
    }
    let html = fs.readFileSync(source, 'utf8');
    html = fixBrand(html);
    html = rewireNav(html);
    html = tagBody(html, spec.page);
    html = injectAssets(html);
    fs.writeFileSync(path.join(OUT, spec.file), html, 'utf8');
    built.push(spec.file);
  }
  return built;
}

if (require.main === module) {
  const built = build();
  console.log(`FinFTech frontend: ${built.length} pÃƒÂ¡ginas generadas en public/`);
  for (const f of built) console.log(`  - ${f}`);
}

module.exports = { build };
