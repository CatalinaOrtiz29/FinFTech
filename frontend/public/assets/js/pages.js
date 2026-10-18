/* FinFTech - renderizadores de cada pantalla (usando las clases del diseÃƒÂ±o de Stitch) */
(function () {
  var FF = (window.FF = window.FF || {});
  var U = FF.ui;
  var api = FF.api;

  function main() {
    return document.querySelector('main');
  }

  function setLoading() {
    main().innerHTML = U.loading();
  }

  async function guarded(fn) {
    setLoading();
    try {
      await fn();
    } catch (err) {
      if (err && err.status === 401 && FF.auth) {
        FF.auth.clear();
        location.href = 'sign-in.html';
        return;
      }
      main().innerHTML = U.errorBox(err);
    }
  }

  function statusBadge(run) {
    if (run.live || run.status === 'running') return U.badge('running');
    return U.badge(run.result || run.status);
  }

  function runRow(run) {
    var lat = (run.metrics && run.metrics.latencyMs) || {};
    return (
      '<tr class="hover:bg-surface/80 dark:hover:bg-slate-800/40 transition-colors">' +
      '<td class="py-3.5 px-6 font-code-mono font-semibold text-primary-container dark:text-blue-400">' + U.esc(run.id) + '</td>' +
      '<td class="py-3.5 px-6"><div class="font-semibold text-on-surface dark:text-inverse-on-surface">' + U.esc(run.label || run.scenario) + '</div><div class="text-[12px] text-outline">' + U.esc(run.scenario) + '</div></td>' +
      '<td class="py-3.5 px-6 text-secondary dark:text-secondary-fixed-dim">' + U.date(run.startedAt) + '</td>' +
      '<td class="py-3.5 px-6 font-code-mono text-secondary dark:text-secondary-fixed-dim">' + U.duration(run.durationMs) + '</td>' +
      '<td class="py-3.5 px-6 font-code-mono text-on-surface dark:text-inverse-on-surface">' + U.num((run.config && run.config.vus) || 0) + '</td>' +
      '<td class="py-3.5 px-6 font-code-mono text-on-surface dark:text-inverse-on-surface">' + U.num((run.metrics && run.metrics.requests) || 0) + '</td>' +
      '<td class="py-3.5 px-6">' + statusBadge(run) + '</td>' +
      '<td class="py-3.5 px-6 text-right"><button class="inline-flex items-center gap-1 text-primary-container dark:text-blue-400 hover:underline font-label-sm text-label-sm font-medium" data-run-detail="' + U.esc(run.id) + '">' + U.icon('description', 15) + '<span>Ver reporte</span></button></td>' +
      '</tr>'
    );
  }

  var RUNS_HEAD =
    '<thead><tr class="bg-surface dark:bg-slate-800/60 border-b border-outline-variant/30 dark:border-slate-800 text-label-sm font-label-sm text-secondary dark:text-secondary-fixed-dim uppercase tracking-wide">' +
    '<th class="py-3 px-6 font-semibold">Run ID</th><th class="py-3 px-6 font-semibold">Escenario</th><th class="py-3 px-6 font-semibold">Fecha</th>' +
    '<th class="py-3 px-6 font-semibold">DuraciÃƒÂ³n</th><th class="py-3 px-6 font-semibold">VUs</th><th class="py-3 px-6 font-semibold">Solicitudes</th>' +
    '<th class="py-3 px-6 font-semibold">Resultado</th><th class="py-3 px-6 font-semibold text-right">Acciones</th></tr></thead>';

  function runsTable(runs) {
    if (!runs.length) return U.empty('AÃƒÂºn no hay ejecuciones registradas.', 'Lanza un escenario desde Test Lab.');
    return '<div class="overflow-x-auto"><table class="w-full text-left border-collapse">' + RUNS_HEAD + '<tbody class="divide-y divide-outline-variant/20 dark:divide-slate-800 text-body-sm font-body-sm">' + runs.map(runRow).join('') + '</tbody></table></div>';
  }

  /* ---------- Modal de detalle de ejecuciÃƒÂ³n ---------- */
  function openDetail(id) {
    var backdrop = document.createElement('div');
    backdrop.id = 'ff-detail-backdrop';
    backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    backdrop.innerHTML = '<div class="bg-surface-container-lowest dark:bg-slate-900 rounded-xl border border-outline-variant/40 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">' + U.loading('Cargando reporteÃ¢â‚¬Â¦') + '</div>';
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.remove();
    });
    document.body.appendChild(backdrop);
    api
      .run(id)
      .then(function (res) {
        var run = res.run;
        var m = run.metrics || {};
        var checks = (m.checks || []).map(function (c) {
          return '<li class="flex items-center justify-between py-2 border-b border-outline-variant/20 dark:border-slate-800"><span class="text-body-sm">' + U.icon(c.ok ? 'check_circle' : 'cancel', 16) + ' ' + U.esc(c.name) + (c.note ? '<span class="block text-[12px] text-outline">' + U.esc(c.note) + '</span>' : '') + '</span><span class="font-code-mono text-[12px] ' + (c.ok ? 'text-emerald-600' : 'text-red-600') + '">' + U.esc(c.actual) + ' / ' + U.esc(c.limit) + '</span></li>';
        }).join('');
        backdrop.querySelector('div').innerHTML =
          '<div class="flex items-start justify-between mb-4"><div><h2 class="text-headline-md font-headline-md">' + U.esc(run.id) + '</h2><p class="text-body-sm text-secondary">' + U.esc(run.label || run.scenario) + ' Ã‚Â· ' + U.date(run.startedAt) + '</p></div>' + statusBadge(run) + '</div>' +
          '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">' +
          mini('Solicitudes', U.num(m.requests)) + mini('Errores', U.num(m.errors)) + mini('P95', U.ms(m.latencyMs && m.latencyMs.p95)) + mini('RPS', U.num(m.rps)) +
          '</div>' +
          (checks ? '<h3 class="text-label-sm uppercase text-secondary tracking-wide mb-1">Criterios de evaluaciÃƒÂ³n</h3><ul class="mb-4">' + checks + '</ul>' : '') +
          '<div class="flex flex-wrap gap-3"><a class="inline-flex items-center gap-1 text-primary-container hover:underline text-label-md" href="' + api.exportUrl('/api/runs/' + id + '/report.json') + '" target="_blank" rel="noopener">' + U.icon('download', 16) + 'JSON</a>' +
          '<a class="inline-flex items-center gap-1 text-primary-container hover:underline text-label-md" href="' + api.exportUrl('/api/runs/' + id + '/report.csv') + '" target="_blank" rel="noopener">' + U.icon('download', 16) + 'CSV</a>' +
          '<button class="ml-auto text-secondary hover:text-on-surface text-label-md" id="ff-close-detail">Cerrar</button></div>';
        backdrop.querySelector('#ff-close-detail').onclick = function () {
          backdrop.remove();
        };
      })
      .catch(function (err) {
        backdrop.querySelector('div').innerHTML = U.errorBox(err);
      });
  }

  function mini(label, value) {
    return '<div class="rounded-lg border border-outline-variant/30 dark:border-slate-800 p-3"><div class="text-[11px] uppercase tracking-wide text-secondary">' + U.esc(label) + '</div><div class="font-code-mono text-lg text-on-surface dark:text-inverse-on-surface">' + U.esc(value) + '</div></div>';
  }

  /* ---------- Dashboard ---------- */
  async function dashboard() {
    await guarded(async function () {
      var results = await Promise.all([api.metrics(), api.services(), api.runs('limit=5')]);
      var metrics = results[0];
      var services = results[1].services;
      var runs = results[2].runs;

      var healthy = services.filter(function (s) {
        return s.status === 'ok';
      }).length;
      var availability = ((healthy / services.length) * 100).toFixed(1);

      var kpis =
        '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">' +
        U.metricCard({ icon: 'bolt', label: 'Latencia media', value: U.ms(metrics.latency.avg), color: 'text-blue-600 dark:text-blue-400', foot: 'p95 ' + U.ms(metrics.latency.p95) + ' Ã‚Â· p99 ' + U.ms(metrics.latency.p99) }) +
        U.metricCard({ icon: 'database', label: 'Solicitudes procesadas', value: U.num(metrics.requests.total), color: 'text-blue-600 dark:text-blue-400', foot: 'ÃƒÅ¡ltimos ' + metrics.throughput.windowSeconds + 's: ' + metrics.throughput.rps + ' rps' }) +
        U.metricCard({ icon: 'warning', label: 'Tasa de errores', value: U.pct(metrics.requests.errorRate), color: 'text-red-500', foot: U.num(metrics.requests.errors) + ' errores 5xx' }) +
        U.metricCard({ icon: 'shield', label: 'Disponibilidad', value: availability + '%', color: 'text-emerald-600 dark:text-emerald-400', foot: healthy + ' de ' + services.length + ' componentes disponibles' }) +
        '</div>';

      var lat = metrics.latency;
      var chart =
        '<div class="lg:col-span-8">' +
        U.card({
          icon: 'bar_chart',
          title: 'Latencia y throughput',
          subtitle: 'MÃƒÂ©tricas en vivo de la API (desde el arranque del servicio).',
          body:
            '<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">' +
            mini('avg', U.ms(lat.avg)) + mini('p50', U.ms(lat.p50)) + mini('p90', U.ms(lat.p90)) + mini('p95', U.ms(lat.p95)) + mini('p99', U.ms(lat.p99)) +
            '</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">' +
            mini('rps (10s)', U.num(metrics.throughput.rps)) + mini('muestras', U.num(lat.count)) + mini('uptime', metrics.uptimeSeconds + ' s') +
            '</div>',
        }) +
        '</div>';

      var healthRows = services
        .map(function (s) {
          return (
            '<div class="py-3 flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-surface-container dark:bg-slate-800 flex items-center justify-center text-secondary">' +
            U.icon(s.name === 'database' ? 'database' : s.name === 'chaos' ? 'bolt' : s.name === 'k6' ? 'equalizer' : s.name === 'toxiproxy' ? 'hub' : 'code', 18) +
            '</div><div><div class="text-body-sm font-label-md font-semibold text-on-surface dark:text-inverse-on-surface">' + U.esc(s.label) + '</div><div class="text-[12px] font-code-mono text-outline">' + U.esc(s.name) + '</div></div></div><div class="flex items-center gap-3">' +
            U.badge(s.status) +
            '<span class="text-[11px] font-code-mono text-outline max-w-[180px] truncate" title="' + U.esc(s.detail) + '">' + U.esc(s.detail) + '</span></div></div>'
          );
        })
        .join('');
      var health = '<div class="lg:col-span-4">' + U.card({ icon: 'dns', title: 'Salud de la infraestructura', subtitle: 'Estado real de los componentes del laboratorio.', body: '<div class="divide-y divide-outline-variant/20 dark:divide-slate-800">' + healthRows + '</div>' }) + '</div>';

      var recent = U.card({
        icon: 'history',
        title: 'Ejecuciones recientes',
        subtitle: 'ÃƒÅ¡ltimas pruebas registradas en el historial.',
        pad: false,
        body: runsTable(runs),
      });

      main().innerHTML =
        U.pageHeader('Performance overview', 'Comprende cÃƒÂ³mo se comporta la API de la billetera bajo carga y fallos.', '<a href="test-lab.html" class="h-9 px-4 rounded-lg bg-primary-container hover:bg-primary text-white font-label-md text-label-md flex items-center gap-2 shadow-sm">' + U.icon('play_arrow', 18) + '<span>Ejecutar una prueba</span></a>') +
        kpis +
        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">' + chart + health + '</div>' +
        recent;

      wireRunDetails(main());
    });
  }

  function wireRunDetails(root) {
    root.querySelectorAll('[data-run-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDetail(btn.getAttribute('data-run-detail'));
      });
    });
  }

  /* ---------- Test Lab ---------- */
  var LAB_FIELDS = ['vus', 'durationSec', 'rampUpSec', 'thinkTimeMs', 'latencyMs', 'jitterMs', 'failureRate', 'repeats'];

  async function testLab() {
    await guarded(async function () {
      var data = await api.scenarios();
      var scenarios = data.scenarios;
      var current = scenarios[0];

      function formFor(sc) {
        var d = sc.defaults || {};
        return (
          '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
          U.field('Usuarios virtuales (VUs)', U.input({ id: 'ff-vus', type: 'number', min: 1, max: 100, value: d.vus || 1 })) +
          U.field('DuraciÃƒÂ³n (segundos)', U.input({ id: 'ff-duration', type: 'number', min: 1, max: 60, value: Math.round((d.durationMs || 5000) / 1000) })) +
          U.field('Ramp-up (segundos)', U.input({ id: 'ff-ramp', type: 'number', min: 0, max: 60, value: Math.round((d.rampUpMs || 0) / 1000) })) +
          U.field('Think time (ms)', U.input({ id: 'ff-think', type: 'number', min: 0, value: d.thinkTimeMs || 0 })) +
          U.field('Latencia inyectada (ms)', U.input({ id: 'ff-latency', type: 'number', min: 0, value: d.latencyMs || 0 })) +
          U.field('Jitter (ms)', U.input({ id: 'ff-jitter', type: 'number', min: 0, value: d.jitterMs || 0 })) +
          U.field('Tasa de fallo (0..1)', U.input({ id: 'ff-failure', type: 'number', min: 0, max: 1, value: d.failureRate === undefined ? 0 : d.failureRate })) +
          U.field('Repeticiones (idempotencia)', U.input({ id: 'ff-repeats', type: 'number', min: 2, value: d.repeats || 20 })) +
          '</div>'
        );
      }

      main().innerHTML =
        U.pageHeader('Test Lab & Chaos Studio', 'Configura un escenario y ejecÃƒÂºtalo contra la API real del laboratorio.') +
        '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">' +
        '<div class="lg:col-span-5">' +
        U.card({
          icon: 'science',
          title: 'ConfiguraciÃƒÂ³n del escenario',
          subtitle: 'Definir los parÃƒÂ¡metros de la ejecuciÃƒÂ³n.',
          body:
            '<div class="space-y-4">' +
            U.field('Escenario', U.select({ id: 'ff-scenario' }, scenarios.map(function (s) { return { value: s.key, label: s.label }; }))) +
            '<p id="ff-scenario-desc" class="text-body-sm text-secondary dark:text-secondary-fixed-dim -mt-2">' + U.esc(current.description) + '</p>' +
            '<div id="ff-params">' + formFor(current) + '</div>' +
            '<div class="flex flex-wrap gap-3">' +
            U.button('Restablecer valores', { variant: 'outline', icon: 'restart_alt', id: 'ff-reset' }) +
            U.button('Lanzar experimento', { variant: 'primary', icon: 'rocket_launch', id: 'ff-launch' }) +
            U.button('Exportar script k6', { variant: 'ghost', icon: 'download', id: 'ff-export' }) +
            '</div></div>',
        }) +
        '</div>' +
        '<div class="lg:col-span-7">' + U.card({ icon: 'monitoring', title: 'Resultado de la ejecuciÃƒÂ³n', subtitle: 'Progreso y criterios evaluados.', body: '<div id="ff-run-result">' + U.empty('Sin ejecuciÃƒÂ³n activa.', 'Configura y lanza un escenario.') + '</div>' }) + '</div>' +
        '</div>';

      var select = document.getElementById('ff-scenario');
      select.addEventListener('change', function () {
        current = scenarios.filter(function (s) { return s.key === select.value; })[0];
        document.getElementById('ff-scenario-desc').textContent = current.description;
        document.getElementById('ff-params').innerHTML = formFor(current);
      });

      document.getElementById('ff-reset').addEventListener('click', function () {
        document.getElementById('ff-params').innerHTML = formFor(current);
      });

      document.getElementById('ff-export').addEventListener('click', function () {
        downloadK6(select.value, collectConfig());
      });

      document.getElementById('ff-launch').addEventListener('click', function () {
        launchRun(select.value, collectConfig());
      });
    });
  }

  function collectConfig() {
    function v(id) {
      var el = document.getElementById(id);
      return el ? Number(el.value) : 0;
    }
    return {
      vus: v('ff-vus'),
      durationMs: v('ff-duration') * 1000,
      rampUpMs: v('ff-ramp') * 1000,
      thinkTimeMs: v('ff-think'),
      latencyMs: v('ff-latency'),
      jitterMs: v('ff-jitter'),
      failureRate: v('ff-failure'),
      repeats: v('ff-repeats'),
    };
  }

  function progressBar(pct) {
    return '<div class="w-full h-1.5 rounded-full bg-surface-container dark:bg-slate-800 overflow-hidden"><div class="h-full bg-primary-container transition-all" style="width:' + pct + '%"></div></div>';
  }

  async function launchRun(scenario, config) {
    var box = document.getElementById('ff-run-result');
    if (!box) return;
    try {
      var res = await api.startRun({ scenario: scenario, config: config });
      var id = res.run.id;
      U.toast('EjecuciÃƒÂ³n ' + id + ' iniciada', 'success');
      var poll = setInterval(async function () {
        try {
          var current = (await api.run(id)).run;
          var m = current.metrics || {};
          var el = document.getElementById('ff-run-result');
          if (!el) {
            clearInterval(poll);
            return;
          }
          var live = current.live || current.status === 'running';
          el.innerHTML =
            '<div class="space-y-4">' +
            '<div class="flex items-center justify-between"><span class="font-code-mono text-primary-container">' + U.esc(id) + '</span>' + (live ? U.badge('running') : U.badge(current.result || current.status)) + '</div>' +
            (live ? progressBar(Math.min(100, Math.round(((Date.now() - new Date(current.startedAt).getTime()) / Math.max(1, config.durationMs)) * 100))) : '') +
            '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">' + mini('Solicitudes', U.num(m.requests)) + mini('Errores', U.num(m.errors)) + mini('P95', U.ms(m.latencyMs && m.latencyMs.p95)) + mini('RPS', U.num(m.rps)) + '</div>' +
            ((m.checks || []).length ? '<ul>' + m.checks.map(function (c) { return '<li class="flex justify-between py-1.5 border-b border-outline-variant/20 dark:border-slate-800 text-body-sm"><span>' + U.icon(c.ok ? 'check_circle' : 'cancel', 16) + ' ' + U.esc(c.name) + '</span><span class="font-code-mono text-[12px]">' + U.esc(c.actual) + '</span></li>'; }).join('') + '</ul>' : '') +
            (live ? '<button id="ff-abort" class="text-red-600 text-label-md hover:underline">Cancelar ejecuciÃƒÂ³n</button>' : '<a class="text-primary-container hover:underline text-label-md" href="history.html">Ver en el historial</a>') +
            '</div>';
          var abort = document.getElementById('ff-abort');
          if (abort) abort.onclick = function () { api.cancelRun(id).then(function () { U.toast('CancelaciÃƒÂ³n solicitada', 'info'); }); };
          if (!live) clearInterval(poll);
        } catch (e) {
          clearInterval(poll);
        }
      }, 1200);
    } catch (err) {
      box.innerHTML = U.errorBox(err);
    }
  }

  function downloadK6(scenario, cfg) {
    var script =
      '// FinFTech - script k6 generado desde Test Lab\n' +
      "import http from 'k6/http';\nimport { check } from 'k6';\n\n" +
      'export const options = { vus: ' + cfg.vus + ", duration: '" + Math.max(1, Math.round(cfg.durationMs / 1000)) + "s',\n" +
      "  thresholds: { http_req_duration: ['p(95)<800'], http_req_failed: ['rate<0.01'] } };\n\n" +
      "const BASE = __ENV.K6_BASE_URL || 'http://api:3000';\n\n" +
      'export default function () {\n' +
      (scenario === 'functional'
        ? "  const h = http.get(BASE + '/health');\n  check(h, { 'health 200': (r) => r.status === 200 });\n"
        : "  const payload = JSON.stringify({ from: 'acc_alice', to: 'acc_bob', amount: 0.5 });\n  const res = http.post(BASE + '/transfer', payload, { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `k6-${__VU}-${__ITER}-${Date.now()}` } });\n  check(res, { 'transfer ok': (r) => r.status === 201 || r.status === 200 });\n") +
      '}\n';
    var blob = new Blob([script], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'finftech-' + scenario + '.k6.js';
    a.click();
    URL.revokeObjectURL(a.href);
    U.toast('Script k6 descargado', 'success');
  }

  /* ---------- Live Runs ---------- */
  async function liveRuns() {
    await guarded(async function () {
      main().innerHTML =
        U.pageHeader('Live runs', 'Ejecuciones activas y su telemetrÃƒÂ­a en tiempo real.', U.button('Actualizar', { variant: 'outline', icon: 'refresh', id: 'ff-refresh' })) +
        '<div id="ff-live" class="space-y-6"></div>' +
        '<div id="ff-live-recent">' + U.card({ icon: 'history', title: 'Ejecuciones recientes', subtitle: 'ÃƒÅ¡ltimas pruebas finalizadas.', pad: false, body: U.loading() }) + '</div>';

      document.getElementById('ff-refresh').onclick = refresh;
      refresh();
      var timer = setInterval(refresh, 2000);
      window.addEventListener('beforeunload', function () { clearInterval(timer); });
    });
  }

  async function refresh() {
    var liveBox = document.getElementById('ff-live');
    if (!liveBox) return;
    try {
      var active = (await api.activeRuns()).runs;
      var runs = (await api.runs('limit=6')).runs;
      if (active.length === 0) {
        liveBox.innerHTML = U.card({ icon: 'monitoring', title: 'Sin ejecuciones activas', subtitle: 'No hay pruebas en curso en este momento.', body: '<div class="pt-2">' + U.empty('El laboratorio estÃƒÂ¡ en reposo.', 'Lanza un escenario desde Test Lab.') + '</div>' });
      } else {
        liveBox.innerHTML = active
          .map(function (r) {
            var m = r.metrics || {};
            var elapsed = Date.now() - new Date(r.startedAt).getTime();
            var total = (r.config && r.config.durationMs) || 1;
            return U.card({
              icon: 'sensors',
              title: (r.label || r.scenario) + ' Ã‚Â· ' + r.id,
              subtitle: 'Progreso ' + Math.min(100, Math.round((elapsed / total) * 100)) + '%',
              body: '<div class="space-y-3">' + progressBar(Math.min(100, Math.round((elapsed / total) * 100))) +
                '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">' + mini('Solicitudes', U.num(m.requests)) + mini('Errores', U.num(m.errors)) + mini('P95', U.ms(m.latencyMs && m.latencyMs.p95)) + mini('RPS', U.num(m.rps)) + '</div>' +
                '<button class="text-red-600 text-label-md hover:underline" data-abort="' + U.esc(r.id) + '">Cancelar ejecuciÃƒÂ³n</button></div>',
            });
          })
          .join('');
        liveBox.querySelectorAll('[data-abort]').forEach(function (b) {
          b.onclick = function () { api.cancelRun(b.getAttribute('data-abort')).then(refresh); };
        });
      }
      var recentBox = document.getElementById('ff-live-recent');
      if (recentBox) recentBox.innerHTML = U.card({ icon: 'history', title: 'Ejecuciones recientes', subtitle: 'ÃƒÅ¡ltimas pruebas finalizadas.', pad: false, body: runsTable(runs) });
      wireRunDetails(document);
    } catch (err) {
      liveBox.innerHTML = U.errorBox(err);
    }
  }

  /* ---------- History & Reports ---------- */
  async function history() {
    await guarded(async function () {
      var scenarios = (await api.scenarios()).scenarios;
      main().innerHTML =
        U.pageHeader('History & Reports', 'Consulta, compara y exporta los resultados de ejecuciones anteriores.',
          U.button('Exportar CSV', { variant: 'outline', icon: 'download', id: 'ff-exp-csv' }) + U.button('Exportar JSON', { variant: 'outline', icon: 'download', id: 'ff-exp-json' })
        ) +
        U.card({
          icon: 'filter_alt', title: 'Filtros', subtitle: 'Acota el historial por escenario y resultado.',
          body: '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' +
            U.field('Escenario', U.select({ id: 'ff-f-scenario' }, [{ value: '', label: 'Todos' }].concat(scenarios.map(function (s) { return { value: s.key, label: s.label }; })))) +
            U.field('Resultado', U.select({ id: 'ff-f-status' }, [{ value: '', label: 'Todos' }, { value: 'passed', label: 'Satisfactorio' }, { value: 'degraded', label: 'Degradado' }, { value: 'failed', label: 'Fallido' }, { value: 'cancelled', label: 'Cancelado' }, { value: 'incomplete', label: 'Incompleto' }])) +
            '<div class="flex items-end">' + U.button('Aplicar', { variant: 'primary', icon: 'search', id: 'ff-f-apply' }) + '</div>' +
            '</div>',
        }) +
        '<div id="ff-history">' + U.card({ icon: 'table_view', title: 'Ejecuciones', pad: false, body: U.loading() }) + '</div>';

      async function load() {
        var q = [];
        var sc = document.getElementById('ff-f-scenario').value;
        var st = document.getElementById('ff-f-status').value;
        if (sc) q.push('scenario=' + sc);
        if (st) q.push('status=' + st);
        q.push('limit=50');
        var box = document.getElementById('ff-history');
        try {
          var runs = (await api.runs(q.join('&'))).runs;
          box.innerHTML = U.card({ icon: 'table_view', title: 'Ejecuciones (' + runs.length + ')', subtitle: 'Resultados registrados en el historial.', pad: false, body: runsTable(runs) });
          wireRunDetails(box);
        } catch (err) {
          box.innerHTML = U.errorBox(err);
        }
      }
      document.getElementById('ff-f-apply').onclick = load;
      document.getElementById('ff-exp-csv').onclick = function () { window.open(api.exportUrl('/api/history/export.csv'), '_blank'); };
      document.getElementById('ff-exp-json').onclick = function () { window.open(api.exportUrl('/api/history/export.json'), '_blank'); };
      load();
    });
  }

  /* ---------- Settings ---------- */
  async function settings() {
    await guarded(async function () {
      var results = await Promise.all([api.settings(), api.chaos(), api.services()]);
      var s = results[0].settings;
      var chaosState = results[1].chaos;
      var apiSvc = results[2].services.filter(function (x) { return x.name === 'api'; })[0];

      main().innerHTML =
        U.pageHeader('Settings & Lab Configuration', 'Solo se muestran opciones que el backend aplica realmente.') +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">' +
        U.card({
          icon: 'tune', title: 'ConfiguraciÃƒÂ³n del laboratorio', subtitle: 'Valores aplicados por la API.',
          body: '<div class="space-y-4">' +
            U.field('Escenario por defecto', U.select({ id: 'ff-s-def', value: s.defaultScenario }, ['functional', 'load', 'concurrency', 'ramp', 'latency', 'outage', 'recovery', 'idempotency'].map(function (k) { return { value: k, label: k }; }))) +
            U.field('LÃƒÂ­mite de historial', U.input({ id: 'ff-s-limit', type: 'number', min: 1, max: 200, value: s.historyLimit })) +
            U.field('Auto-reset de caos (ms)', U.input({ id: 'ff-s-auto', type: 'number', min: 0, value: s.autoResetChaosMs }), 'Si es > 0, la inyecciÃƒÂ³n de fallos se revierte automÃƒÂ¡ticamente.') +
            U.button('Guardar configuraciÃƒÂ³n', { variant: 'primary', icon: 'save', id: 'ff-s-save' }) +
            '<div id="ff-s-msg"></div></div>',
        }) +
        U.card({
          icon: 'bolt', title: 'InyecciÃƒÂ³n de fallos (aplicaciÃƒÂ³n)', subtitle: 'Sustituto ejecutable de Toxiproxy cuando Docker no estÃƒÂ¡ disponible.',
          body: '<div class="space-y-4">' +
            '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' +
            U.field('Latencia (ms)', U.input({ id: 'ff-c-latency', type: 'number', min: 0, value: (chaosState.latency && chaosState.latency.ms) || 0 })) +
            U.field('Jitter (ms)', U.input({ id: 'ff-c-jitter', type: 'number', min: 0, value: (chaosState.latency && chaosState.latency.jitterMs) || 0 })) +
            U.field('Tasa de fallo (0..1)', U.input({ id: 'ff-c-failure', type: 'number', min: 0, max: 1, value: (chaosState.failure && chaosState.failure.rate) || 0 })) +
            '</div><div class="flex flex-wrap gap-3">' +
            U.button('Aplicar latencia', { variant: 'primary', icon: 'hourglass_empty', id: 'ff-c-apply-lat' }) +
            U.button('Aplicar fallo', { variant: 'danger', icon: 'bolt', id: 'ff-c-apply-fail' }) +
            U.button('Restaurar normal', { variant: 'outline', icon: 'restart_alt', id: 'ff-c-reset' }) +
            '</div><div id="ff-c-state">' + chaosSummary(chaosState) + '</div></div>',
        }) +
        '</div>' +
        U.card({
          icon: 'info', title: 'InformaciÃƒÂ³n y funciones no disponibles', subtitle: 'Transparencia sobre el alcance real.',
          body: '<ul class="text-body-sm space-y-2 text-secondary dark:text-secondary-fixed-dim">' +
            '<li>' + U.icon('check_circle', 16) + ' API en <span class="font-code-mono">' + U.esc(FF.apiBase()) + '</span> Ã‚Â· ' + U.esc(apiSvc ? apiSvc.detail : '') + '</li>' +
            '<li>' + U.icon('info', 16) + ' <strong>SonarQube, Toxiproxy y k6</strong> requieren Docker: se entregan en <span class="font-code-mono">docker-compose.yml</span>, pero no se ejecutan en este equipo (Docker no estÃƒÂ¡ instalado).</li>' +
            '<li>' + U.icon('block', 16) + ' <strong>Webhooks, SLA guardrails, SSO (Okta/SAML), API keys y gestiÃƒÂ³n de equipos</strong> no estÃƒÂ¡n implementados y se muestran como no disponibles.</li>' +
            '</ul>',
        });

      document.getElementById('ff-s-save').onclick = async function () {
        try {
          await api.saveSettings({
            defaultScenario: document.getElementById('ff-s-def').value,
            historyLimit: document.getElementById('ff-s-limit').value,
            autoResetChaosMs: document.getElementById('ff-s-auto').value,
          });
          document.getElementById('ff-s-msg').innerHTML = '<p class="text-emerald-600 text-body-sm mt-2">ConfiguraciÃƒÂ³n guardada y aplicada.</p>';
          U.toast('ConfiguraciÃƒÂ³n guardada', 'success');
        } catch (err) {
          document.getElementById('ff-s-msg').innerHTML = U.errorBox(err);
        }
      };

      async function applyChaos(fn) {
        try {
          var res = await fn();
          document.getElementById('ff-c-state').innerHTML = chaosSummary(res.chaos);
          U.toast('InyecciÃƒÂ³n aplicada', 'success');
        } catch (err) {
          document.getElementById('ff-c-state').innerHTML = U.errorBox(err);
        }
      }
      document.getElementById('ff-c-apply-lat').onclick = function () {
        applyChaos(function () {
          return api.chaosLatency(Number(document.getElementById('ff-c-latency').value), Number(document.getElementById('ff-c-jitter').value));
        });
      };
      document.getElementById('ff-c-apply-fail').onclick = function () {
        applyChaos(function () {
          return api.chaosFailure(Number(document.getElementById('ff-c-failure').value));
        });
      };
      document.getElementById('ff-c-reset').onclick = function () {
        applyChaos(function () { return api.chaosReset(); });
      };
    });
  }

  function chaosSummary(state) {
    return '<div class="mt-3 flex items-center gap-3 text-body-sm">' + (state.enabled ? U.badge('active') : U.badge('ok', 'Normal')) +
      '<span class="text-secondary dark:text-secondary-fixed-dim">latencia ' + ((state.latency && state.latency.ms) || 0) + ' ms Ã‚Â· fallo ' + ((state.failure && state.failure.rate) || 0) + '</span></div>';
  }

  /* ---------- Profile & Team ---------- */
  async function profile() {
    await guarded(async function () {
      var user = null;
      try {
        user = (await api.me()).user;
      } catch (e) {
        user = FF.auth.user();
      }
      if (!user) {
        location.href = 'sign-in.html';
        return;
      }
      main().innerHTML =
        U.pageHeader('Profile & Team Management', 'Perfil de la sesiÃƒÂ³n actual.') +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">' +
        U.card({
          icon: 'person', title: 'Perfil', subtitle: 'Datos del usuario autenticado.',
          body: '<div class="space-y-3 text-body-md">' + kv('Nombre', user.name) + kv('Correo', user.email) + kv('Rol', user.role) + kv('ID', user.id) + '</div>' +
            '<div class="mt-4">' + U.button('Cerrar sesiÃƒÂ³n', { variant: 'danger', icon: 'logout', id: 'ff-logout' }) + '</div>',
        }) +
        U.card({
          icon: 'group', title: 'Equipo y acceso', subtitle: 'Alcance actual del sistema.',
          body: '<div class="space-y-3 text-body-sm text-secondary dark:text-secondary-fixed-dim">' +
            '<p>' + U.icon('check_circle', 16) + ' Usuarios reales: la API soporta registro y autenticaciÃƒÂ³n con token.</p>' +
            '<p>' + U.icon('block', 16) + ' Invitaciones de equipo, roles avanzados (RBAC por proyecto), API keys/CLI y preferencias de alertas <strong>no estÃƒÂ¡n implementados</strong>.</p>' +
            '</div>',
        }) +
        '</div>';
      document.getElementById('ff-logout').onclick = function () {
        FF.auth.clear();
        location.href = 'sign-in.html';
      };
    });
  }

  function kv(k, v) {
    return '<div class="flex justify-between border-b border-outline-variant/20 dark:border-slate-800 py-2"><span class="text-secondary dark:text-secondary-fixed-dim">' + U.esc(k) + '</span><span class="font-code-mono text-on-surface dark:text-inverse-on-surface">' + U.esc(v) + '</span></div>';
  }

  /* ---------- Sign In ---------- */
  function signIn() {
    main().innerHTML =
      '<div class="max-w-md mx-auto">' +
      U.card({
        icon: 'shield_person', title: 'Sign in to FinFTech', subtitle: 'Enterprise Load & Resilience Simulation',
        body: '<div class="space-y-4">' +
          '<div id="ff-auth-msg"></div>' +
          U.field('Correo', U.input({ id: 'ff-email', type: 'email', placeholder: 'admin@finftech.local', value: 'admin@finftech.local' })) +
          U.field('ContraseÃƒÂ±a', U.input({ id: 'ff-password', type: 'password', placeholder: 'finftech-admin', value: 'finftech-admin' })) +
          U.button('Iniciar sesiÃƒÂ³n', { variant: 'primary', icon: 'arrow_forward', id: 'ff-signin' }) +
          '<p class="text-body-sm text-secondary dark:text-secondary-fixed-dim text-center">Ã‚Â¿No tienes cuenta? <a class="text-primary-container hover:underline" href="sign-up.html">Crear cuenta</a></p>' +
          '<p class="text-[12px] text-outline text-center">Credenciales de demostraciÃƒÂ³n: <span class="font-code-mono">admin@finftech.local</span> / <span class="font-code-mono">finftech-admin</span></p>' +
          '</div>',
      }) + '</div>';
    var btn = document.getElementById('ff-signin');
    btn.onclick = async function () {
      var email = document.getElementById('ff-email').value;
      var password = document.getElementById('ff-password').value;
      var msg = document.getElementById('ff-auth-msg');
      msg.innerHTML = '';
      btn.disabled = true;
      try {
        var res = await api.login(email, password);
        FF.auth.set(res.token, res.user);
        location.href = 'dashboard.html';
      } catch (err) {
        msg.innerHTML = U.errorBox(err);
        btn.disabled = false;
      }
    };
  }

  /* ---------- Sign Up ---------- */
  function signUp() {
    main().innerHTML =
      '<div class="max-w-lg mx-auto">' +
      U.card({
        icon: 'rocket_launch', title: 'Create your workspace', subtitle: 'Registro para el laboratorio FinFTech.',
        body: '<div class="space-y-4">' +
          '<div id="ff-auth-msg"></div>' +
          U.field('Nombre', U.input({ id: 'ff-name', placeholder: 'Ada Lovelace' })) +
          U.field('Correo', U.input({ id: 'ff-email', type: 'email', placeholder: 'tu@correo.com' })) +
          U.field('ContraseÃƒÂ±a', U.input({ id: 'ff-password', type: 'password', placeholder: 'MÃƒÂ­nimo 8 caracteres' }), 'MÃƒÂ­nimo 8 caracteres.') +
          U.button('Crear cuenta y entrar', { variant: 'primary', icon: 'rocket_launch', id: 'ff-signup' }) +
          '<p class="text-body-sm text-secondary dark:text-secondary-fixed-dim text-center">Ã‚Â¿Ya tienes cuenta? <a class="text-primary-container hover:underline" href="sign-in.html">Iniciar sesiÃƒÂ³n</a></p>' +
          '<p class="text-[12px] text-outline text-center">Los roles de onboarding de Stitch (SRE/QA/Backend/Architect) no aplican: se crea un usuario miembro.</p>' +
          '</div>',
      }) + '</div>';
    var btn = document.getElementById('ff-signup');
    btn.onclick = async function () {
      var msg = document.getElementById('ff-auth-msg');
      msg.innerHTML = '';
      btn.disabled = true;
      try {
        var res = await api.register({
          name: document.getElementById('ff-name').value,
          email: document.getElementById('ff-email').value,
          password: document.getElementById('ff-password').value,
        });
        FF.auth.set(res.token, res.user);
        location.href = 'dashboard.html';
      } catch (err) {
        msg.innerHTML = U.errorBox(err);
        btn.disabled = false;
      }
    };
  }

  FF.pages = {
    dashboard: dashboard,
    'test-lab': testLab,
    'live-runs': liveRuns,
    history: history,
    settings: settings,
    profile: profile,
    'sign-in': signIn,
    'sign-up': signUp,
  };
})();
