/* FinFTech - cliente de la API y gestiÃƒÂ³n de sesiÃƒÂ³n */
(function () {
  var FF = (window.FF = window.FF || {});
  var CFG = window.FINFTECH_CONFIG;

  var TOKEN_KEY = 'finftech.token';
  var USER_KEY = 'finftech.user';

  var auth = {
    token: function () {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch (e) {
        return null;
      }
    },
    user: function () {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      } catch (e) {
        return null;
      }
    },
    set: function (token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user || null));
    },
    clear: function () {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    isAuthed: function () {
      return Boolean(auth.token());
    },
  };

  function ApiError(message, status, code, details) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
    this.code = code;
    this.details = details;
  }
  ApiError.prototype = Object.create(Error.prototype);

  async function request(method, path, options) {
    options = options || {};
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, CFG.requestTimeoutMs);

    var headers = { 'content-type': 'application/json' };
    if (options.headers) {
      for (var k in options.headers) headers[k] = options.headers[k];
    }
    if (options.auth !== false) {
      var t = auth.token();
      if (t) headers['authorization'] = 'Bearer ' + t;
    }

    var res;
    try {
      res = await fetch(CFG.apiBase + path, {
        method: method,
        headers: headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      var aborted = err && err.name === 'AbortError';
      throw new ApiError(
        aborted ? 'La API no respondiÃƒÂ³ a tiempo (timeout).' : 'No se pudo conectar con la API en ' + CFG.apiBase,
        0,
        'network_error'
      );
    }
    clearTimeout(timer);

    var text = await res.text();
    var data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }

    if (!res.ok) {
      var msg = (data && data.message) || 'Error ' + res.status;
      throw new ApiError(msg, res.status, (data && data.code) || 'error', data && data.details);
    }
    return data;
  }

  FF.ApiError = ApiError;
  FF.auth = auth;
  FF.api = {
    get: function (p, o) {
      return request('GET', p, o);
    },
    post: function (p, body, o) {
      return request('POST', p, Object.assign({ body: body }, o || {}));
    },
    put: function (p, body, o) {
      return request('PUT', p, Object.assign({ body: body }, o || {}));
    },
    // Endpoints de dominio
    health: function () {
      return request('GET', '/health', { auth: false });
    },
    login: function (email, password) {
      return request('POST', '/api/auth/login', { body: { email: email, password: password }, auth: false });
    },
    register: function (payload) {
      return request('POST', '/api/auth/register', { body: payload, auth: false });
    },
    me: function () {
      return request('GET', '/api/auth/me');
    },
    metrics: function () {
      return request('GET', '/api/metrics', { auth: false });
    },
    services: function () {
      return request('GET', '/api/services', { auth: false });
    },
    scenarios: function () {
      return request('GET', '/api/scenarios', { auth: false });
    },
    runs: function (q) {
      return request('GET', '/api/runs' + (q ? '?' + q : ''), { auth: false });
    },
    activeRuns: function () {
      return request('GET', '/api/runs/active', { auth: false });
    },
    compare: function (ids) {
      return request('GET', '/api/history/compare?ids=' + ids.join(','), { auth: false });
    },
    run: function (id) {
      return request('GET', '/api/runs/' + id, { auth: false });
    },
    startRun: function (body) {
      return request('POST', '/api/runs', { body: body });
    },
    cancelRun: function (id) {
      return request('POST', '/api/runs/' + id + '/cancel', { body: {} });
    },
    accounts: function () {
      return request('GET', '/api/accounts', { auth: false });
    },
    transfers: function () {
      return request('GET', '/api/transfers?limit=20', { auth: false });
    },
    settings: function () {
      return request('GET', '/api/settings', { auth: false });
    },
    saveSettings: function (body) {
      return request('PUT', '/api/settings', { body: body });
    },
    chaos: function () {
      return request('GET', '/api/chaos', { auth: false });
    },
    chaosLatency: function (ms, jitterMs) {
      return request('POST', '/api/chaos/latency', { body: { ms: ms, jitterMs: jitterMs || 0 } });
    },
    chaosFailure: function (rate) {
      return request('POST', '/api/chaos/failure', { body: { rate: rate } });
    },
    chaosReset: function () {
      return request('POST', '/api/chaos/reset', { body: {} });
    },
    exportUrl: function (p) {
      return CFG.apiBase + p;
    },
  };
})();
