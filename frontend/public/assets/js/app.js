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
    chip.className = 'flex items-center gap-2 ml-4 min-w-0';
    if (FF.auth.isAuthed() && user) {
      chip.innerHTML =
        '<span class="hidden md:inline text-body-sm text-secondary dark:text-secondary-fixed-dim truncate max-w-[120px]" title="' + FF.ui.esc(user.email) + '">' + FF.ui.esc(user.email) + '</span>' +
        '<a href="profile.html" class="h-8 px-3 rounded-lg border border-outline-variant/50 dark:border-slate-700 text-label-sm font-label-sm flex items-center gap-1.5 hover:bg-surface-container dark:hover:bg-slate-800 shrink-0">' + FF.ui.icon('person', 15) + '<span>Perfil</span></a>' +
        '<button id="ff-top-logout" class="h-8 px-3 rounded-lg text-label-sm font-label-sm text-secondary hover:text-red-600 flex items-center gap-1.5 shrink-0">' + FF.ui.icon('logout', 15) + '<span>Salir</span></button>';
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

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('finftech.theme'); } catch (e) { saved = null; }
    var theme = (saved === 'dark' || saved === 'light') ? saved : 'light';
    applyTheme(theme, false);
    wireThemeToggle();
  }

  function applyTheme(theme, persist) {
    var root = document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    if (persist) {
      try { localStorage.setItem('finftech.theme', theme); } catch (e) {}
    }
    syncThemeToggle(theme);
  }

  function syncThemeToggle(theme) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var isDark = theme === 'dark';
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('title', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  }

  function wireThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (btn.__ffThemeWired) return;
    // El HTML de Stitch incluye un listener inline que solo hace toggle de la
    // clase 'dark' sin persistir. Se reemplaza el nodo para eliminar ese
    // listener y dejar un unico manejador que persiste la preferencia.
    var clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.__ffThemeWired = true;
    clone.addEventListener('click', function () {
      var isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark', true);
    });
  }

  function computeInitials(user) {
    if (!user) return '?';
    var name = String(user.name || '');
    var email = String(user.email || '');
    var initials = '?';
    if (name) {
      var parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      } else if (parts.length === 1) {
        var single = parts[0];
        initials = (single.charAt(0) + (single.length > 1 ? single.charAt(1) : '')).toUpperCase();
      }
    } else if (email) {
      initials = email.charAt(0).toUpperCase();
    }
    return initials.slice(0, 2);
  }

  function updateUserAvatars(user) {
    var initials = computeInitials(user || FF.auth.user());
    var avatars = document.querySelectorAll('[data-ff-avatar]');
    avatars.forEach(function (el) {
      el.textContent = initials;
      el.setAttribute('aria-label', 'Usuario: ' + initials);
    });
    var name = user || FF.auth.user();
    if (name && name.name) {
      document.querySelectorAll('header span, aside span').forEach(function (el) {
        if (el.textContent.trim() === 'Claire Vance') el.textContent = name.name;
      });
    }
    // Compatibilidad con cabeceras antiguas generadas por Stitch que pueden
    // no conservar el atributo data-ff-avatar despuÃƒÂ©s de ser actualizadas.
    document.querySelectorAll('header .rounded-full').forEach(function (el) {
      if (el.classList.contains('bg-primary-container')) el.textContent = initials;
    });
  }

  // La cabecera se pinta antes de que algunas pÃƒÂ¡ginas consulten /api/me.
  // Refrescamos las iniciales desde la sesiÃƒÂ³n real para no dejar el avatar
  // de Stitch (CV) en Overview, Test Lab, Live Runs, History o Settings.
  function refreshUserAvatarFromApi() {
    if (!FF.auth.isAuthed() || !FF.api || !FF.api.me) return;
    FF.api.me().then(function (result) {
      if (result && result.user) {
        try { localStorage.setItem('finftech.user', JSON.stringify(result.user)); } catch (e) {}
        updateUserAvatars(result.user);
      }
    }).catch(function () {});
  }

  function boot() {
    initTheme();
    var page = document.body.getAttribute('data-page') || 'dashboard';
    highlightNav(page);
    ensureSessionChip();
    updateUserAvatars();
    refreshUserAvatarFromApi();
    // Da tiempo a que la API responda incluso en un arranque lento.
    setTimeout(refreshUserAvatarFromApi, 1000);

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
