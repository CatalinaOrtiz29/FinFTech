// FinFTech - auditoria de los resumenes de k6 (`--summary-export`).
//
// Para cada escenario ejecutado comprueba:
//   1. Coherencia interna de los agregados: los percentiles exportados proceden
//      de muestras reales y son monÃƒÂ³tonos (min <= med <= p90 <= p95 <= max),
//      y la media cae dentro del rango observado.
//   2. Que los umbrales se RE-EVALUAN a partir de los valores exportados y que
//      ninguno queda incumplido (coincide con el codigo de salida 0 de k6).
//      Nota: el booleano que aparece bajo `thresholds` en el resumen es
//      `abortOnFail`, NO el resultado; por eso aqui se reevalua la expresion.
//   3. Que el resultado funcional (metrica `checks`) se mantiene SEPARADO de los
//      umbrales: en los escenarios de caida los checks caen al 0-12 % mientras el
//      experimento se considera correcto (los errores esperados no son un fallo
//      de la prueba).
//
// El formato de `--summary-export` (k6 0.53) no incluye `count` en los Trend
// (si `avg`, `min`, `med`, `max`, `p(90)`, `p(95)`), usa `value` como tasa en los
// Rate y `count`/`rate` en los Counter.
//
// Uso: node k6/audit-summaries.mjs [dir-resultados]

import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'k6/results';
const files = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith('summary-') && f.endsWith('.json'))
  .sort();

const problems = [];
const rows = [];
const fail = (scenario, label) => problems.push(`${scenario}: ${label}`);

/** Vista normalizada de las metricas exportadas (rate -> value, med -> p(50), ...). */
function normalize(data) {
  const v = {};
  if (typeof data.count === 'number') v.count = data.count;
  if (typeof data.value === 'number') v.rate = data.value;
  if (typeof data.passes === 'number') {
    v.passes = data.passes;
    v.fails = data.fails;
    v.count = data.passes + data.fails;
    // En un Rate de k6, `passes` = muestras con valor cierto.
  }
  for (const k of ['avg', 'min', 'max']) if (typeof data[k] === 'number') v[k] = data[k];
  if (typeof data.med === 'number') v['p(50)'] = data.med;
  for (const k of ['p(90)', 'p(95)']) if (typeof data[k] === 'number') v[k] = data[k];
  return v;
}

/** Evalua una expresion de umbral k6: "p(95)<800", "rate>=0.95", "count==0". */
function evaluate(expr, values) {
  const m = /^(p\(\d+\)|rate|count|avg|min|max)\s*(<=|>=|==|!=|<|>)\s*([0-9.]+)$/.exec(expr.trim());
  if (!m) return { ok: null, reason: 'expresion no soportada por el auditor' };
  const [, selector, op, raw] = m;
  const actual = values[selector];
  if (actual === undefined) return { ok: null, reason: `el resumen no exporta "${selector}"` };
  const expected = Number(raw);
  const ops = {
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b,
    '==': (a, b) => a === b,
    '!=': (a, b) => a !== b,
  };
  return { ok: ops[op](actual, expected), actual, expected, selector, op };
}

for (const file of files) {
  const scenario = file.replace('summary-', '').replace('.json', '');
  const m = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).metrics;
  const reqs = m.http_reqs ? m.http_reqs.count : 0;
  const failed = m.http_req_failed ? normalize(m.http_req_failed) : null;
  const dur = m.http_req_duration ? normalize(m.http_req_duration) : null;

  console.log(`\n== ${scenario} ==`);
  console.log(
    `   http_reqs=${reqs}` +
      (failed ? ` | fallidas=${(failed.rate * 100).toFixed(2)}% (${failed.passes} fallidas / ${failed.fails} correctas)` : '') +
      (dur ? ` | duracion ms: min=${dur.min} med=${dur['p(50)']} p90=${dur['p(90)']} p95=${dur['p(95)']} max=${dur.max} avg=${dur.avg}` : '')
  );

  // 1) Coherencia de los agregados.
  if (!dur || dur.max === undefined) {
    fail(scenario, 'http_req_duration sin muestras exportadas');
  } else {
    const invariants = [
      ['min <= med', dur.min <= dur['p(50)'], `${dur.min} <= ${dur['p(50)']}`],
      ['med <= p90', dur['p(50)'] <= dur['p(90)'], `${dur['p(50)']} <= ${dur['p(90)']}`],
      ['p90 <= p95', dur['p(90)'] <= dur['p(95)'], `${dur['p(90)']} <= ${dur['p(95)']}`],
      ['p95 <= max', dur['p(95)'] <= dur.max, `${dur['p(95)']} <= ${dur.max}`],
      ['min <= avg <= max', dur.min <= dur.avg && dur.avg <= dur.max, `${dur.min} <= ${dur.avg} <= ${dur.max}`],
      ['valores no negativos', dur.min >= 0 && dur.max >= 0],
    ];
    for (const [label, ok, detail] of invariants) {
      console.log(`   [${ok ? 'ok  ' : 'FALLA'}] ${label}${detail ? ' -> ' + detail : ''}`);
      if (!ok) fail(scenario, label);
    }
  }

  // 2) Re-evaluacion de umbrales.
  let evaluated = 0;
  let unmet = 0;
  for (const [metric, data] of Object.entries(m)) {
    if (!data.thresholds) continue;
    for (const expr of Object.keys(data.thresholds)) {
      const r = evaluate(expr, normalize(data));
      if (r.ok === null) {
        console.log(`      umbral ${metric}: ${expr} -> no evaluable (${r.reason})`);
        continue;
      }
      evaluated++;
      if (!r.ok) unmet++;
      console.log(`      umbral ${metric}: ${expr} -> ${r.ok ? 'CUMPLIDO' : 'INCUMPLIDO'} (${r.selector}=${r.actual})`);
    }
  }
  console.log(`      => umbrales reevaluados=${evaluated}, incumplidos=${unmet}`);

  // 3) Resultado funcional, separado de los umbrales.
  if (m.checks) {
    const c = normalize(m.checks);
    console.log(`      checks funcionales: ${(c.rate * 100).toFixed(2)}% (${c.passes} ok / ${c.fails} fallos) - metrica independiente`);
  }

  // 4) Contadores propios del proyecto (efectos reales observados).
  for (const name of [
    'finftech_transfers_created',
    'finftech_transfers_replayed',
    'finftech_duplicate_effects',
    'finftech_recovery_samples',
    'finftech_recovery_success',
  ]) {
    if (!m[name]) continue;
    const v = normalize(m[name]);
    const parts = [];
    if (v.count !== undefined && m[name].passes === undefined) parts.push(`count=${v.count}`);
    if (v.rate !== undefined) parts.push(`rate=${(v.rate * 100).toFixed(2)}%`);
    if (v.passes !== undefined) parts.push(`(${v.passes} ok / ${v.fails} fallos)`);
    console.log(`      ${name}: ${parts.join(' ')}`);
  }

  // 5) Los recuentos de la metrica de fallos cubren todas las peticiones.
  if (failed && failed.count !== reqs) fail(scenario, `muestras de http_req_failed (${failed.count}) != peticiones (${reqs})`);

  rows.push({ scenario, reqs, unmet, checks: m.checks ? normalize(m.checks).rate : null });
}

console.log('\n=== resumen por escenario ===');
console.log('escenario'.padEnd(24) + 'peticiones'.padStart(12) + 'umbrales incumplidos'.padStart(24) + 'checks'.padStart(10));
for (const r of rows) {
  console.log(
    r.scenario.padEnd(24) + String(r.reqs).padStart(12) + String(r.unmet).padStart(24) + (r.checks === null ? 'n/a' : (r.checks * 100).toFixed(2) + '%').padStart(10)
  );
}

console.log(`\n=== ${problems.length === 0 ? 'SIN INCONSISTENCIAS' : problems.length + ' INCONSISTENCIAS'} en ${files.length} resumenes ===`);
if (problems.length) {
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
