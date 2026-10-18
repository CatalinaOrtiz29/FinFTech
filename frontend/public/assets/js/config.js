/* FinFTech - configuraciÃƒÂ³n de runtime del frontend */
window.FINFTECH_CONFIG = (function () {
  var saved = null;
  try {
    saved = localStorage.getItem('finftech.apiBase');
  } catch (e) {
    saved = null;
  }
  var base;
  if (saved) {
    base = saved;
  } else if (location.port === '3000') {
    base = '';
  } else {
    base = location.protocol + '//' + location.hostname + ':3000';
  }
  return {
    product: 'FinFTech',
    version: '1.0.0',
    apiBase: String(base).replace(/\/$/, ''),
    requestTimeoutMs: 15000,
  };
})();
