/* FinFTech - utilidades de interfaz (reutilizan las clases del diseÃƒÂ±o de Stitch) */
(function () {
  var FF = (window.FF = window.FF || {});

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(n) {
    if (n === null || n === undefined || isNaN(n)) return 'Ã¢â‚¬â€';
    return Number(n).toLocaleString('en-US');
  }

  function ms(n) {
    if (n === null || n === undefined || isNaN(n)) return 'Ã¢â‚¬â€';
    if (n >= 1000) return (n / 1000).toFixed(2) + ' s';
    return Math.round(n) + ' ms';
  }

  function pct(n) {
    if (n === null || n === undefined || isNaN(n)) return 'Ã¢â‚¬â€';
    return Number(n).toFixed(2) + '%';
  }

  function duration(msValue) {
    if (!msValue && msValue !== 0) return 'Ã¢â‚¬â€';
    var s = Math.round(msValue / 1000);
    if (s < 60) return s + ' s';
    return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  }

  function date(iso) {
    if (!iso) return 'Ã¢â‚¬â€';
    var d = new Date(iso);
    return d.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  var STATUS = {
    passed: { label: 'Satisfactorio', cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/50', dot: 'bg-emerald-500' },
    degraded: { label: 'Degradado', cls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/50', dot: 'bg-amber-500' },
    failed: { label: 'Fallido', cls: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200/50', dot: 'bg-red-500' },
    incomplete: { label: 'Incompleto', cls: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border-orange-200/50', dot: 'bg-orange-500' },
    cancelled: { label: 'Cancelado', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300/50', dot: 'bg-slate-400' },
    running: { label: 'En ejecuciÃƒÂ³n', cls: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200/50', dot: 'bg-blue-500' },
    ok: { label: 'Saludable', cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/50', dot: 'bg-emerald-500' },
    error: { label: 'Error', cls: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200/50', dot: 'bg-red-500' },
    external: { label: 'Requiere Docker', cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300/50', dot: 'bg-slate-400' },
    active: { label: 'Activa', cls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200/50', dot: 'bg-amber-500' },
  };

  function badge(status, customLabel) {
    var s = STATUS[status] || STATUS.cancelled;
    return (
      '<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ' +
      s.cls +
      ' text-[12px] font-medium border">' +
      '<span class="w-1.5 h-1.5 rounded-full ' +
      s.dot +
      '"></span>' +
      esc(customLabel || s.label) +
      '</span>'
    );
  }

  function icon(name, size) {
    return '<span class="material-symbols-outlined" data-icon="' + esc(name) + '" style="font-size:' + (size || 18) + 'px;">' + esc(name) + '</span>';
  }

  function card(opts) {
    var header = '';
    if (opts.title) {
      header =
        '<div class="flex items-start gap-3 pb-4">' +
        '<div class="w-8 h-8 rounded-lg bg-surface-container dark:bg-slate-800 flex items-center justify-center text-primary-container dark:text-primary-fixed mt-0.5">' +
        icon(opts.icon || 'insights', 20) +
        '</div><div><h2 class="text-headline-md font-headline-md text-on-surface dark:text-inverse-on-surface">' +
        esc(opts.title) +
        '</h2>' +
        (opts.subtitle ? '<p class="text-body-sm font-body-sm text-secondary dark:text-secondary-fixed-dim">' + esc(opts.subtitle) + '</p>' : '') +
        '</div></div>';
    }
    return (
      '<div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/40 dark:border-slate-800 rounded-xl ' +
      (opts.pad === false ? '' : 'p-6 ') +
      'custom-shadow transition-colors">' +
      header +
      (opts.body || '') +
      '</div>'
    );
  }

  function pageHeader(title, subtitle, actionsHtml) {
    return (
      '<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">' +
      '<div><div class="flex items-center gap-3"><h1 class="text-headline-lg font-headline-lg text-on-surface dark:text-inverse-on-surface">' +
      esc(title) +
      '</h1><span class="px-2 py-0.5 rounded text-[11px] font-code-mono font-medium bg-surface-container-high dark:bg-slate-800 text-secondary dark:text-secondary-fixed-dim border border-outline-variant/30">LAB MODE</span></div>' +
      (subtitle ? '<p class="text-body-md font-body-md text-secondary dark:text-secondary-fixed-dim mt-1">' + esc(subtitle) + '</p>' : '') +
      '</div>' +
      (actionsHtml ? '<div class="flex items-center gap-3 self-start md:self-auto">' + actionsHtml + '</div>' : '') +
      '</div>'
    );
  }

  function button(label, opts) {
    opts = opts || {};
    var base = 'h-9 px-4 rounded-lg font-label-md text-label-md flex items-center gap-2 transition-all duration-150 active:scale-[0.98] ';
    var variants = {
      primary: 'bg-primary-container hover:bg-primary text-white shadow-sm',
      outline: 'border border-outline-variant/50 dark:border-slate-700 bg-surface-container-lowest dark:bg-slate-800 text-on-surface dark:text-inverse-on-surface hover:bg-surface-container dark:hover:bg-slate-700',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
      ghost: 'text-secondary dark:text-secondary-fixed-dim hover:bg-surface-container dark:hover:bg-slate-800',
    };
    var attrs = '';
    if (opts.id) attrs += ' id="' + esc(opts.id) + '"';
    if (opts.disabled) attrs += ' disabled';
    if (opts.data) for (var k in opts.data) attrs += ' data-' + k + '="' + esc(opts.data[k]) + '"';
    var disabledCls = opts.disabled ? ' opacity-50 cursor-not-allowed' : '';
    return '<button class="' + base + (variants[opts.variant || 'primary'] || variants.primary) + disabledCls + '"' + attrs + '>' + (opts.icon ? icon(opts.icon, 18) : '') + '<span>' + esc(label) + '</span></button>';
  }

  function input(opts) {
    var attrs = ' class="w-full h-[38px] px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-body-md font-body-md text-on-surface dark:text-inverse-on-surface focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"';
    if (opts.id) attrs += ' id="' + esc(opts.id) + '"';
    if (opts.type) attrs += ' type="' + esc(opts.type) + '"';
    if (opts.value !== undefined) attrs += ' value="' + esc(opts.value) + '"';
    if (opts.min !== undefined) attrs += ' min="' + esc(opts.min) + '"';
    if (opts.max !== undefined) attrs += ' max="' + esc(opts.max) + '"';
    if (opts.placeholder) attrs += ' placeholder="' + esc(opts.placeholder) + '"';
    if (opts.disabled) attrs += ' disabled';
    return '<input' + attrs + '/>';
  }

  function select(opts, options) {
    var attrs = ' class="w-full h-[38px] px-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-body-md font-body-md text-on-surface dark:text-inverse-on-surface focus:border-primary focus:outline-none"';
    if (opts.id) attrs += ' id="' + esc(opts.id) + '"';
    var body = options
      .map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (o.value === opts.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
      })
      .join('');
    return '<select' + attrs + '>' + body + '</select>';
  }

  function field(label, control, hint) {
    return '<label class="block"><span class="block text-label-sm font-label-sm uppercase tracking-wide text-secondary dark:text-secondary-fixed-dim mb-1.5">' + esc(label) + '</span>' + control + (hint ? '<span class="block text-[12px] text-outline mt-1">' + esc(hint) + '</span>' : '') + '</label>';
  }

  function loading(text) {
    return '<div class="flex items-center justify-center py-24 text-secondary dark:text-secondary-fixed-dim gap-3"><span class="material-symbols-outlined animate-spin">progress_activity</span><span>' + esc(text || 'Cargando datos realesÃ¢â‚¬Â¦') + '</span></div>';
  }

  function empty(text, hint) {
    return '<div class="flex flex-col items-center justify-center py-16 text-center"><span class="material-symbols-outlined text-outline" style="font-size:40px;">inbox</span><p class="mt-3 text-body-md text-secondary dark:text-secondary-fixed-dim">' + esc(text) + '</p>' + (hint ? '<p class="text-body-sm text-outline mt-1">' + esc(hint) + '</p>' : '') + '</div>';
  }

  function errorBox(err) {
    var msg = err && err.message ? err.message : 'Error desconocido';
    var extra = err && err.code === 'network_error' ? 'Verifica que la API estÃƒÂ© en ejecuciÃƒÂ³n (docker compose up).' : '';
    return '<div class="rounded-lg border border-red-200/70 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-4 text-red-700 dark:text-red-400 text-body-sm"><strong class="font-semibold">' + esc(msg) + '</strong>' + (extra ? '<div class="mt-1 text-[12px]">' + esc(extra) + '</div>' : '') + '</div>';
  }

  function toast(message, type) {
    var box = document.getElementById('ff-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'ff-toast';
      box.className = 'fixed bottom-6 right-6 z-[100] flex flex-col gap-2';
      document.body.appendChild(box);
    }
    var colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      info: 'bg-slate-800',
    };
    var node = document.createElement('div');
    node.className = (colors[type] || colors.info) + ' text-white px-4 py-3 rounded-lg shadow-lg text-body-sm max-w-sm';
    node.textContent = message;
    box.appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .3s';
      node.style.opacity = '0';
      setTimeout(function () {
        node.remove();
      }, 300);
    }, 3500);
  }

  function metricCard(opts) {
    return (
      '<div class="bg-surface-container-lowest dark:bg-slate-900 border border-outline-variant/40 dark:border-slate-800 rounded-xl p-5 custom-shadow transition-colors">' +
      '<div class="flex items-center justify-between text-secondary dark:text-secondary-fixed-dim mb-3"><div class="flex items-center gap-2">' +
      '<span class="material-symbols-outlined ' + (opts.color || 'text-blue-600 dark:text-blue-400') + '" style="font-size:18px;">' + esc(opts.icon) + '</span>' +
      '<span class="text-label-md font-label-md">' + esc(opts.label) + '</span></div></div>' +
      '<div class="flex items-baseline gap-1.5"><span class="text-metric-stat font-metric-stat text-on-surface dark:text-inverse-on-surface">' + esc(opts.value) + '</span>' +
      (opts.unit ? '<span class="text-headline-sm font-headline-sm text-secondary dark:text-secondary-fixed-dim">' + esc(opts.unit) + '</span>' : '') +
      '</div>' +
      (opts.foot ? '<div class="mt-3 text-body-sm font-body-sm text-secondary dark:text-secondary-fixed-dim">' + opts.foot + '</div>' : '') +
      '</div>'
    );
  }

  FF.ui = {
    esc: esc,
    num: num,
    ms: ms,
    pct: pct,
    duration: duration,
    date: date,
    badge: badge,
    icon: icon,
    card: card,
    pageHeader: pageHeader,
    button: button,
    input: input,
    select: select,
    field: field,
    loading: loading,
    empty: empty,
    errorBox: errorBox,
    toast: toast,
    metricCard: metricCard,
    STATUS: STATUS,
  };
})();
