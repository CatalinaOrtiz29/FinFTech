# VerificaciÃƒÂ³n Ã¢â‚¬â€ FinFTech

Evidencia de las comprobaciones **realmente ejecutadas** durante la construcciÃƒÂ³n, con
entorno: Windows, Node v24.21.0, npm 11.19.0, git 2.55.0. La verificaciÃƒÂ³n se completÃƒÂ³ con
**Docker Desktop** (Docker 29.8.2, Compose v5.6.0, motor sobre WSL2 con kernel
`6.18.54.1-microsoft-standard-WSL2`); los apartados 6.x documentan lo ejecutado en
contenedores. Cada resultado consignado aquÃƒÂ­ procede de una ejecuciÃƒÂ³n real; nada se estima.

## Resumen

| Ãƒrea | Estado |
|------|--------|
| API (health, auth, transferencias) | Ã¢Å“â€¦ Ejecutada y verificada |
| Persistencia SQLite | Ã¢Å“â€¦ Verificada (incluido reinicio y recreaciÃƒÂ³n de contenedores) |
| Idempotencia + concurrencia | Ã¢Å“â€¦ Verificada (pruebas + HTTP + k6) |
| Ejecutor de pruebas y escenarios | Ã¢Å“â€¦ Verificado (8 escenarios, criterios reales) |
| MÃƒÂ©tricas, historial, informes, comparaciÃƒÂ³n | Ã¢Å“â€¦ Verificados |
| CORS frontend Ã¢â€ â€ API | Ã¢Å“â€¦ Verificado |
| Build y servido del frontend | Ã¢Å“â€¦ Verificado (9 pÃƒÂ¡ginas, assets; tambiÃƒÂ©n vÃƒÂ­a Nginx en Docker) |
| Pruebas automatizadas | Ã¢Å“â€¦ 13/13 (cobertura de lÃƒÂ­nea ~53 %) |
| Docker Compose (api/frontend/toxiproxy/k6/sonar) | Ã¢Å“â€¦ Construido, arrancado y validado |
| k6 (contenedor) | Ã¢Å“â€¦ 13 escenarios ejecutados, exit 0 |
| Toxiproxy (fallos de red) | Ã¢Å“â€¦ Latencia, ancho de banda, corte y recuperaciÃƒÂ³n |
| SonarQube | Ã¢Å“â€¦ AnÃƒÂ¡lisis real: gate OK, 0 bugs, 0 vulnerabilidades |

## Comandos y resultados

### Salud de la API
```
$ curl http://127.0.0.1:3000/health
{"status":"healthy","product":"FinFTech","service":"finftech-api","version":"1.0.0",
 "env":"development","checks":{"api":"ok","database":"ok"}}
```

### Pruebas automatizadas
```
$ node --test "tests/**/*.test.js"
tests 13   pass 13   fail 0
```
Incluye: health, login (200/401), transferencia vÃƒÂ¡lida, replay idempotente (mismo id),
conflicto 409, saldo insuficiente 422, validaciones 400, **30 reintentos concurrentes con la
misma clave Ã¢â€ â€™ 1 creaciÃƒÂ³n + 29 replays**, y **60 transferencias concurrentes con claves
distintas Ã¢â€ â€™ sin saldo negativo**.

### Idempotencia sobre HTTP
```
POST /transfer (Idempotency-Key: k)  -> 201, id=trf_xxxx, idempotentReplay=false
POST /transfer (Idempotency-Key: k)  -> 200, id=trf_xxxx, idempotentReplay=true   (mismo id)
POST /transfer (Idempotency-Key: k, distinto monto) -> 409 conflict
```

### Escenarios del ejecutor interno (resultados reales)
| Escenario | Resultado | ObservaciÃƒÂ³n |
|-----------|-----------|-------------|
| functional | passed | 54 solicitudes, 0 errores, P95 2.8 ms |
| latency | passed | `latency_injected` (P95 Ã¢â€°Ë† 313 ms con 250+50 ms inyectados) |
| outage | passed | `fault_reproduced` (tasa de error 100 %) |
| recovery | passed | `outage_observed` 100 % en la 1Ã‚Âª mitad, `recovered` 0 % al final |
| idempotency | passed | `single_effect`, `no_duplicate_effects`, `no_conflicts` |

### CORS
```
GET  /api/metrics          (Origin: http://localhost:8080) -> 200, ACAO: http://localhost:8080
GET  /api/metrics          (Origin: http://evil.example.com) -> 200, ACAO: (ausente)
OPTIONS /transfer          (preflight) -> 204, allow-headers: Content-Type,Authorization,Idempotency-Key,X-Request-Id
```

### Frontend
```
$ node frontend/build.js
FinFTech frontend: 9 pÃƒÂ¡ginas generadas en public/
  - index.html   - dashboard.html   - test-lab.html   - live-runs.html   - history.html
  - settings.html   - sign-in.html   - sign-up.html   - profile.html

$ (Nginx en Docker, puerto 8080; se compara el tamaÃƒÂ±o servido con el real del contenedor)
index.html 41463  dashboard.html 41463  test-lab.html 32970  live-runs.html 37533
history.html 42149  settings.html 28466  sign-in.html 20589  sign-up.html 26239
profile.html 41485
200 /assets/js/app.js  200 /assets/js/pages.js  200 /assets/css/finftech.css  200 /favicon.svg

# Nginx aplica try_files ... /index.html (SPA), por lo que una ruta inexistente
# responde 200 con el contenido de index.html (41463 B) Ã¢â‚¬â€ no es una pÃƒÂ¡gina real.
```

Comprobar el tamaÃƒÂ±o evita confundir el *fallback* de la SPA con pÃƒÂ¡ginas existentes:
`transfer.html` o `load-lab.html` devolvÃƒÂ­an 200 por ese motivo aunque no existen.

### ComparaciÃƒÂ³n
```
GET /api/history/compare?ids=run_A,run_B
{"deltas":{"p95Pct":167.9,"errorRatePct":-100,"rpsPct":-41.4}}
```

## 6. VerificaciÃƒÂ³n en Docker (ejecutada)

### 6.1 Entorno

```
$ docker --version          Docker version 29.8.2, build ...
$ docker compose version    Docker Compose version v5.6.0
$ docker info               Server 29.8.2, kernel 6.18.54.1-microsoft-standard-WSL2,
                            12 CPUs, ~7.4 GB de memoria
$ docker compose config --quiet   exit 0  (perfiles "load" y "quality" vÃƒÂ¡lidos)
```

Incidencias reproducidas y resueltas: (a) el motor requerÃƒÂ­a **reiniciar Windows** tras
habilitar *Virtual Machine Platform*; (b) la resoluciÃƒÂ³n DNS del demonio fallÃƒÂ³ de forma
**transitoria** contra el DNS de Tailscale (`100.100.100.100`) al descargar imÃƒÂ¡genes Ã¢â‚¬â€
se resolviÃƒÂ³ con `ipconfig /flushdns` **sin cambiar** la configuraciÃƒÂ³n de red.

### 6.2 ConstrucciÃƒÂ³n y arranque

```
$ docker compose build
 -> finftech/api:local (node:24-alpine, 256 MB)
 -> finftech/frontend:local (nginx:1.27-alpine, 74 MB)

$ docker compose up -d
NAME                 STATUS                  PORTS
finftech-api         Up (healthy)            0.0.0.0:3000->3000/tcp
finftech-frontend    Up (healthy)            0.0.0.0:8080->80/tcp
finftech-toxiproxy   Up                      127.0.0.1:8474->8474/tcp, 8666->8666/tcp
```

### 6.3 ComunicaciÃƒÂ³n real entre servicios

| ComprobaciÃƒÂ³n | Resultado |
|--------------|-----------|
| `GET http://localhost:8080/` (Nginx) | 200 |
| `GET http://localhost:3000/health` | `{"status":"healthy","checks":{"api":"ok","database":"ok"}}` |
| `GET http://localhost:8080/api/...` (Nginx Ã¢â€ â€™ `api:3000`) | 200 (proxy inverso) |
| Preflight `OPTIONS /transfer` | 204 con `access-control-allow-headers` correctos |
| Variables de entorno inyectadas | `APP_COMMIT=local-verify`, `TOKEN_SECRET` distintivo |
| Volumen | `finftech_finftech-data` montado en `/data` |
| Tablas SQLite | `accounts, app_settings, test_runs, transfers, users` |
| DNS entre contenedores | `api`Ã¢â€ â€™172.18.0.2, `frontend`Ã¢â€ â€™172.18.0.3, `toxiproxy`Ã¢â€ â€™172.18.0.4 |
| `localhost:3000` **dentro del contenedor** | falla (correcto: cada contenedor tiene su propio *localhost*) |
| `api:3000` desde otro contenedor | 200 |
| Login directo y **a travÃƒÂ©s del proxy** (`toxiproxy:8666`) | 200 en ambos |

### 6.4 Escenarios k6 en contenedor

Ejecutados con `docker compose --profile load run --rm k6-run`. **Los 13 terminan con
`exit 0`** (umbrales cumplidos):

| Escenario | exit | Peticiones | Errores | checks | P95 |
|-----------|------|-----------|---------|--------|-----|
| functional | 0 | 106 | 0.00 % | 100 % | 39.2 ms |
| load | 0 | 4 995 | 0.00 % | 100 % | 35.3 ms |
| concurrency | 0 | 4 587 | 0.00 % | 100 % | 166.9 ms |
| ramp | 0 | 14 898 | 0.00 % | 100 % | 27.5 ms |
| idempotency | 0 | 151 | 0.00 % | 100 % | 2.2 ms |
| latency (app) | 0 | 290 | 0.00 % | 100 % | 397.1 ms |
| outage (app) | 0 | 47 634 | 99.99 % | 0 % | 3.7 ms |
| recovery (app) | 0 | 26 826 | 87.72 % | 12 % | 13.4 ms |
| toxiproxy-baseline | 0 | 6 218 | 0.00 % | 100 % | 27.7 ms |
| toxiproxy-latency | 0 | 337 | 0.00 % | 100 % | 314.4 ms |
| toxiproxy-bandwidth | 0 | 657 | 0.00 % | 100 % | 160.4 ms |
| toxiproxy-outage | 0 | 171 655 | 99.99 % | 0 % | ~0 s |
| toxiproxy-recovery | 0 | 85 226 | 96.72 % | 3 % | ~0 s |

Notas de lectura: en `outage` el `checks: 0 %` es el **resultado esperado** (la comprobaciÃƒÂ³n
exige ÃƒÂ©xito, y el fallo inyectado lo impide); los umbrales de esos escenarios piden
precisamente una tasa de error alta. En el escenario `idempotency` se verificÃƒÂ³ que **no se
crean efectos duplicados**: 25 transferencias creadas (`201`), **125 replays** (`200`) y
0 duplicados.

**Defecto reproducible encontrado y corregido:** el script usaba las variables `K6_VUS` /
`K6_DURATION`, que k6 interpreta como **opciones globales** y **sobrescriben** las opciones
por escenario (el escenario `idempotency`, declarado como 1 VU / 25 iteraciones, se ejecutaba
con las VUs y la duraciÃƒÂ³n de la carga). Se renombraron a `K6_LOAD_VUS` / `K6_LOAD_DURATION`.
AdemÃƒÂ¡s se corrigiÃƒÂ³ el contador `finftech_duplicate_effects`, que no contabilizaba los efectos
duplicados.

**Ejecutor interno vs. k6:** el ejecutor propio de la aplicaciÃƒÂ³n se ejercitÃƒÂ³ con
`POST /api/runs` (`functional` e `idempotency` Ã¢â€ â€™ `passed`, registrados en `test_runs`,
consultables en `GET /api/runs`, con informe `report.json`/`report.csv` y exportaciÃƒÂ³n del
historial). Son dos planos distintos: k6 es un contenedor independiente; el ejecutor interno
es una funcionalidad de la API.

### 6.5 Fallos de red con Toxiproxy

El trÃƒÂ¡fico de los escenarios `toxiproxy-*` atraviesa `http://toxiproxy:8666`
(upstream `api:3000`); el fallo lo inyecta Toxiproxy, no la aplicaciÃƒÂ³n.

| TÃƒÂ³xico / acciÃƒÂ³n | ObservaciÃƒÂ³n | Resultado |
|-----------------|-------------|-----------|
| (ninguno) | LÃƒÂ­nea base por el proxy | 6 218 pet., 0 % errores, P95 27.7 ms |
| `latency` 300 ms | Latencia de red | 337 pet., 0 % errores, **P95 314.4 ms** |
| `bandwidth` 4 KB/s | Ancho de banda limitado | 657 pet., **P95 160.4 ms** |
| proxy deshabilitado | Corte de red | 171 655 pet., **99.99 % errores** |
| proxy re-habilitado a mitad | RecuperaciÃƒÂ³n | 96.72 % errores y luego servicio restablecido |

DemostraciÃƒÂ³n directa: **la misma peticiÃƒÂ³n** tarda ~300 ms mÃƒÂ¡s por el proxy con el tÃƒÂ³xico de
latencia que yendo directo a la API, y **falla** cuando el proxy estÃƒÂ¡ deshabilitado mientras
la peticiÃƒÂ³n directa sigue respondiendo Ã¢â‚¬â€ lo que prueba que el trÃƒÂ¡fico atraviesa el proxy y
que el fallo es de red. Tras cada escenario el proxy queda **habilitado y sin tÃƒÂ³xicos**
(se comprueba con `GET http://localhost:8474/proxies`).

> Los escenarios `latency`/`outage`/`recovery` (sin prefijo) usan `/api/chaos/*`: el fallo se
> produce **dentro** de la API y funcionan incluso sin Docker. Los `toxiproxy-*` son el plano
> de **red**. No se confunden entre sÃƒÂ­.

### 6.6 Persistencia ante reinicios

```
antes:   users=1 accounts=4 transfers=<N> runs=<M>   ÃƒÂºltima=trf_0129112d
restart api          -> idÃƒÂ©nticos
down + up -d (sin -v) -> idÃƒÂ©nticos  (el volumen finftech_finftech-data sobrevive)
```

Se verificÃƒÂ³ que `docker compose down` **conserva** el volumen `finftech_finftech-data`
(no se usÃƒÂ³ `-v` en ningÃƒÂºn momento) y que los datos sobreviven a un `restart` y a la
**recreaciÃƒÂ³n** de los contenedores.

### 6.7 SonarQube (perfil `quality`)

```
$ docker compose --profile quality up -d
$ curl -s http://localhost:9000/api/system/status
{"version":"9.9.8.100196","status":"UP"}

$ docker compose --profile quality run --rm -e SONAR_TOKEN=*** sonar-scanner
 -> EXECUTION SUCCESS (38 archivos de cÃƒÂ³digo analizados)
```

Resultado real del anÃƒÂ¡lisis del proyecto `finftech`:

| MÃƒÂ©trica | Valor |
|---------|-------|
| Quality gate | **OK** (3 condiciones evaluadas: reliability/security/maintainability = A) |
| ncloc / ficheros | 2 243 / 36 |
| Bugs / vulnerabilidades | **0** / **0** |
| Code smells / deuda | 9 / 67 min |
| Security hotspots | 17 |
| Cobertura (lÃƒÂ­nea) | **53.3 %** (52.1 % de lÃƒÂ­nea) |
| DuplicaciÃƒÂ³n | 0.0 % |
| Ratings | reliability **A**, security **A**, maintainability **A** |

Los *code smells* son de complejidad cognitiva (`runner.js`, `wallet.js`), regex, `TODO` y
uso de `var`; los *hotspots* son mayoritariamente `Math.random` en k6, `http://` del
laboratorio y expresiones regulares. Se documentan tal cual: **no se han ocultado ni
declarado un resultado distinto del real**. La cobertura proviene del LCOV generado por las
pruebas del backend (`node --test --experimental-test-coverage`); SonarQube muestra 53.3 %
porque resuelve las rutas contra su propio conjunto de fuentes.

**Nota sobre la configuraciÃƒÂ³n:** el proyecto no disponÃƒÂ­a de `sonar-project.properties`, por
lo que se aÃƒÂ±adiÃƒÂ³ (fuentes, exclusiones y enlace al LCOV) junto con el servicio
`sonar-scanner`. La contraseÃƒÂ±a del `admin` por defecto de SonarQube se cambiÃƒÂ³ en el primer
arranque; el token no se guarda en el repositorio.

## Login responsive Ã¢â‚¬â€ verificaciÃƒÂ³n con Edge headless

VerificaciÃƒÂ³n automatizada de `sign-in.html` con Microsoft Edge en modo headless
(`puppeteer-core`) en cuatro resoluciones, **reejecutada contra el frontend servido por
Nginx en Docker** (`http://127.0.0.1:8080/sign-in.html`). En las cuatro, Tailwind quedÃƒÂ³
aplicado (`main` en `display: grid`) y **no hubo desbordamiento horizontal**
(`documentElement.scrollWidth == innerWidth`):

| Viewport | Dos columnas | ÃŽâ€ centrado de la tarjeta vs. su columna | Desbordamiento horizontal |
|----------|--------------|------------------------------------------|---------------------------|
| 1440 Ãƒâ€” 900 | sÃƒÂ­ | 0 px | no |
| 1366 Ãƒâ€” 768 | sÃƒÂ­ | 0 px | no |
| 768 Ãƒâ€” 1024 | no (apilado) | 0 px | no |
| 390 Ãƒâ€” 844 | no (apilado) | 0 px | no |

Pruebas funcionales (Edge headless): credenciales incorrectas Ã¢â€ â€™ Ã‚Â«Credenciales invÃƒÂ¡lidas.Ã‚Â»;
botÃƒÂ³n Ã‚Â«Usar credenciales demoÃ‚Â» Ã¢â€ â€™ rellena `admin@finftech.local` / `finftech-admin`;
login correcto Ã¢â€ â€™ redirecciÃƒÂ³n a `dashboard.html` con token almacenado; alternar la
visibilidad de la contraseÃƒÂ±a (`password Ã¢â€ â€™ text`); envÃƒÂ­o con **Enter**. Consola sin errores
y sin respuestas Ã¢â€°Â¥ 400.

**Causa del defecto corregido:** el `<main>` de Stitch usa `grid grid-cols-1 lg:grid-cols-12`
y el runtime insertaba **un ÃƒÂºnico** hijo, que ocupaba la **columna 1** (Ã¢â€°Ë†1/12 del ancho),
quedando pegado a la izquierda con el resto de la pantalla vacÃƒÂ­o. Ahora se renderizan dos
`<section>` con `lg:col-span-7` (formulario) y `lg:col-span-5` (panel complementario),
respetando la composiciÃƒÂ³n de dos columnas del diseÃƒÂ±o original.

## Estado final de la verificaciÃƒÂ³n

Los servicios se dejan **en ejecuciÃƒÂ³n** (`api`, `frontend`, `toxiproxy`, `sonar-db`,
`sonarqube`) sin borrar volÃƒÂºmenes ni datos. Para reproducir el flujo, ver
[`demo.md`](demo.md); para el detalle de k6, [`../k6/README.md`](../k6/README.md).
