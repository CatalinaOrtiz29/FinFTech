/* FinFTech - arranque de la aplicaciÃƒÂ³n */
(function () {
  var FF = (window.FF = window.FF || {});

  FF.apiBase = function () {
    return window.FINFTECH_CONFIG.apiBase || '(mismo origen)';
  };

  var PROTECTED = ['dashboard', 'test-lab', 'live-runs', 'history', 'settings', 'profile'];
  var NAV_BY_FILE = {
    'dashboard.html': 'dashboard',
    'index.html': 'dashboard',
    'test-lab.html': 'test-lab',
    'live-runs.html': 'live-runs',
    'history.html': 'history',
    'settings.html': 'settings',
    'profile.html': 'profile',
  };

  var ACTIVE_CLASS = 'flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container dark:bg-surface-container-high text-primary dark:text-primary-fixed font-label-md text-label-md transition-colors';
  var INACTIVE_CLASS = 'flex items-center gap-3 px-3 py-2 rounded-lg text-secondary dark:text-secondary-fixed-dim hover:text-on-surface dark:hover:text-inverse-on-surface font-label-md text-label-md hover:bg-surface-container/60 dark:hover:bg-surface-container-high/60 transition-colors';

  function highlightNav(page) {
    var links = document.querySelectorAll('aside a[href]');
    links.forEach(function (a) {
      var file = (a.getAttribute('href') || '').split('/').pop();
      var target = NAV_BY_FILE[file];
      if (!target) return;
      a.className = target === page ? ACTIVE_CLASS : INACTIVE_CLASS;
    });
  }

  function currentFile() {
    var parts = location.pathname.split('/');
    var file = parts[parts.length - 1] || 'index.html';
    return file;
  }

  function ensureSessionChip() {
    var page = document.body.getAttribute('data-page');
    if (page === 'sign-in' || page === 'sign-up') return;
    var header = document.querySelector('header');
    if (!header || document.getElementById('ff-session')) return;
    var user = FF.auth.user();
    var chip = document.createElement('div');
    chip.id = 'ff-session';
    chip.className = 'flex items-center gap-2 ml-4';
    if (FF.auth.isAuthed() && user) {
      chip.innerHTML =
        '<span class="hidden md:inline text-body-sm text-secondary dark:text-secondary-fixed-dim">' + FF.ui.esc(user.email) + '</span>' +
        '<a href="profile.html" class="h-8 px-3 rounded-lg border border-outline-variant/50 dark:border-slate-700 text-label-sm font-label-sm flex items-center gap-1.5 hover:bg-surface-container dark:hover:bg-slate-800">' + FF.ui.icon('person', 15) + '<span>Perfil</span></a>' +
        '<button id="ff-top-logout" class="h-8 px-3 rounded-lg text-label-sm font-label-sm text-secondary hover:text-red-600 flex items-center gap-1.5">' + FF.ui.icon('logout', 15) + '<span>Salir</span></button>';
      header.appendChild(chip);
      document.getElementById('ff-top-logout').onclick = function () {
        FF.auth.clear();
        location.href = 'sign-in.html';
      };
    } else {
      chip.innerHTML = '<a href="sign-in.html" class="h-8 px-3 rounded-lg bg-primary-container hover:bg-primary text-white text-label-sm font-label-sm flex items-center gap-1.5">' + FF.ui.icon('login', 15) + '<span>Iniciar sesiÃƒÂ³n</span></a>';
      header.appendChild(chip);
    }
  }

  function boot() {
    var page = document.body.getAttribute('data-page') || 'dashboard';
    highlightNav(page);
    ensureSessionChip();

    if (PROTECTED.indexOf(page) !== -1 && !FF.auth.isAuthed()) {
      location.replace('sign-in.html');
      return;
    }

    var render = FF.pages[page];
    if (render) {
      render();
    } else {
      var main = document.querySelector('main');
      if (main) main.innerHTML = FF.ui.errorBox(new Error('Pantalla no reconocida: ' + page));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
