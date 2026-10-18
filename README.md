# FinFTech

**FinFTech** es un laboratorio de simulaciÃƒÂ³n de carga y tolerancia a fallos para una API
que representa operaciones de una billetera digital. Permite ejecutar pruebas funcionales y
de rendimiento, inyectar latencia y fallos controlados, medir latencia/throughput/errores,
prevenir transferencias duplicadas mediante idempotencia y consultar el historial con
exportaciÃƒÂ³n de informes.

> Interfaz basada en los 8 diseÃƒÂ±os aprobados de Google Stitch (marca unificada como
> **FinFTech**).

---

## Arquitectura

```
Navegador
   Ã¢â€â€š  (assets estÃƒÂ¡ticos: HTML + Tailwind + JS)
   Ã¢â€“Â¼
Frontend  Ã¢â€â‚¬Ã¢â€â‚¬HTTP/JSONÃ¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Â¶  API FinFTech (Node.js + Express)  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Â¶  SQLite (node:sqlite)
(estÃƒÂ¡tico)                        Ã¢â€â€š                                   Ã¢â€â€š
                                  Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Ejecutor de pruebas interno (VUs, umbrales, resultados)
                                  Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ InyecciÃƒÂ³n de fallos (latencia / errores)
                                  Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Historial, mÃƒÂ©tricas e informes (JSON / CSV)

Componentes opcionales en Docker: Toxiproxy (fallos de red), k6 (carga), SonarQube (calidad)
```

- **API**: Node.js 24 + Express. Sin ORM: usa el mÃƒÂ³dulo nativo `node:sqlite` (no requiere
  compilar dependencias nativas).
- **Persistencia**: SQLite en `backend/data/finftech.db` (volumen `/data` en Docker).
- **Frontend**: pÃƒÂ¡ginas estÃƒÂ¡ticas generadas desde el diseÃƒÂ±o de Stitch (`frontend/build.js`)
  + un runtime JS propio que consume la API real.

## TecnologÃƒÂ­as

| Capa | TecnologÃƒÂ­a |
|------|------------|
| API | Node.js 24, Express 4 |
| Persistencia | SQLite (`node:sqlite`, nativo) |
| Frontend | HTML + Tailwind (CDN del diseÃƒÂ±o) + JS vanilla |
| Contenedores | Docker, Docker Compose (nginx para el frontend) |
| Carga | k6 |
| Fallos de red | Toxiproxy |
| Calidad | Pruebas con `node:test`; SonarQube (perfil opcional) |
| CI | GitHub Actions |

## Estructura del repositorio

```
FinFTech/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ backend/                 API Express
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ src/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ server.js        arranque
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ app.js           composiciÃƒÂ³n de la app
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ db.js            conexiÃƒÂ³n y esquema SQLite
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ lib/             errores, logger, mÃƒÂ©tricas, auth (scrypt + HMAC)
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ middleware/      contexto de peticiÃƒÂ³n, errores, autenticaciÃƒÂ³n
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ routes/          health, auth, wallet, runs, metrics, chaos, settings
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ services/        wallet (idempotencia), runner (carga), chaos, reportsÃ¢â‚¬Â¦
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ tests/               unitarias e integraciÃƒÂ³n (incl. concurrencia)
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Dockerfile
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ frontend/                interfaz (pantallas de Stitch integradas)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ build.js             genera public/ desde _stitch_source
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ public/              pÃƒÂ¡ginas + assets/js (runtime)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ server.js            servidor estÃƒÂ¡tico de desarrollo
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Dockerfile + nginx.conf
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ k6/                      escenarios de carga y caos
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ toxiproxy/               configuraciÃƒÂ³n de proxies
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ _stitch_source/          diseÃƒÂ±os originales aprobados (referencia)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ docker-compose.yml
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ .env.example
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ README.md
```

## Requisitos

- **Con Docker (recomendado)**: Docker + Docker Compose.
- **Sin Docker (permitido para desarrollo)**: Node.js Ã¢â€°Â¥ 22.5 (probado con Node 24) y npm.

## ConfiguraciÃƒÂ³n de variables

Copia `.env.example` a `.env` y ajusta los valores (no versiones el `.env`). Las variables
principales: `PORT`, `DB_PATH`, `TOKEN_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`CORS_ORIGINS` y, para k6, `K6_BASE_URL`, `K6_VUS`, `K6_DURATION`, `K6_P95_MS`,
`K6_ERROR_RATE`.

## Iniciar el entorno

### Con Docker Compose

```bash
cp .env.example .env        # ajustar TOKEN_SECRET y ADMIN_PASSWORD
docker compose up --build -d
```

| Servicio | URL | Puerto |
|----------|-----|--------|
| Frontend | http://localhost:8080 | 8080 |
| API | http://localhost:3000 | 3000 |
| Toxiproxy (proxy) | Ã¢â‚¬â€ | 8666 |
| Toxiproxy (admin, solo local) | http://localhost:8474 | 8474 |
| SonarQube (perfil `quality`) | http://localhost:9000 | 9000 |

### Sin Docker (desarrollo local)

```bash
# 1) API
cd backend
npm ci
npm run seed
npm start                     # http://localhost:3000

# 2) Frontend (otra terminal)
cd frontend
npm run build                 # genera public/ desde _stitch_source
npm start                     # http://localhost:8080
```

El frontend apunta por defecto a `http://<host>:3000`. Puede cambiarse con
`localStorage['finftech.apiBase']` o editando `frontend/public/assets/js/config.js`.

## Verificar la salud de la API

```bash
curl http://localhost:3000/health
# -> { "status": "healthy", "product": "FinFTech", "checks": { "api": "ok", "database": "ok" } }
```

## Ejecutar las pruebas

### Pruebas automatizadas (unitarias + integraciÃƒÂ³n)

```bash
cd backend
npm test
```

Cubren: salud, login, transferencia vÃƒÂ¡lida, replays idempotentes, conflicto 409 por
reutilizaciÃƒÂ³n de clave con cuerpo distinto, saldo insuficiente (422), validaciones (400),
**reintentos concurrentes con la misma clave** (una sola transferencia) y **concurrencia
sin saldo negativo**.

### Escenarios de carga (k6)

```bash
K6_SCENARIO=functional  docker compose --profile load run --rm k6-run
K6_SCENARIO=load        K6_VUS=20 K6_DURATION=30s docker compose --profile load run --rm k6-run
K6_SCENARIO=concurrency docker compose --profile load run --rm k6-run
K6_SCENARIO=latency     docker compose --profile load run --rm k6-run
K6_SCENARIO=outage      docker compose --profile load run --rm k6-run
K6_SCENARIO=recovery    docker compose --profile load run --rm k6-run
K6_SCENARIO=idempotency docker compose --profile load run --rm k6-run
```

Resultados en `k6/results/result.json`. Detalle en [`k6/README.md`](k6/README.md).

## Historial, mÃƒÂ©tricas e informes

- **En la interfaz**: *Performance overview* (mÃƒÂ©tricas en vivo), *History & Reports*
  (listado, detalle, comparaciÃƒÂ³n y exportaciÃƒÂ³n).
- **API**:
  - `GET /api/metrics` Ã¢â‚¬â€ latencia (avg/p50/p90/p95/p99), throughput, errores.
  - `GET /api/runs?limit=50` Ã¢â‚¬â€ historial.
  - `GET /api/history/compare?ids=A,B` Ã¢â‚¬â€ comparaciÃƒÂ³n con deltas.
  - `GET /api/runs/:id/report.json` Ã‚Â· `GET /api/runs/:id/report.csv` Ã¢â‚¬â€ informe de una ejecuciÃƒÂ³n.
  - `GET /api/history/export.csv` Ã‚Â· `GET /api/history/export.json` Ã¢â‚¬â€ historial completo.

Resultados posibles de una ejecuciÃƒÂ³n: `passed` (satisfactorio), `degraded` (degradado),
`failed` (fallido), `incomplete` (incompleto) y `cancelled` (cancelado). Cada escenario de
fallo tiene **criterios explÃƒÂ­citos** (por ejemplo, *recovery* exige observar el fallo y su
recuperaciÃƒÂ³n), por lo que "prueba ejecutada" no se confunde con "sistema validado".

## Idempotencia de transferencias

`POST /transfer` requiere el encabezado `Idempotency-Key` (o el campo `idempotencyKey`):

- Misma clave + mismo cuerpo Ã¢â€ â€™ **replay** (200) con el resultado original, sin doble efecto.
- Misma clave + cuerpo distinto Ã¢â€ â€™ **409 Conflict**.
- La operaciÃƒÂ³n se ejecuta en una transacciÃƒÂ³n `BEGIN IMMEDIATE` y el dÃƒÂ©bito usa una
  actualizaciÃƒÂ³n condicional (`balance_cents >= monto`), por lo que **nunca hay saldo negativo**
  ni transferencias duplicadas bajo concurrencia.

```bash
curl -X POST http://localhost:3000/transfer \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-0001' \
  -d '{"from":"acc_alice","to":"acc_bob","amount":1.5}'
```

## Latencia y fallos controlados

Sin Docker, la inyecciÃƒÂ³n se hace **a nivel de aplicaciÃƒÂ³n** (sustituto de Toxiproxy), desde
la pantalla *Settings* o por API:

```bash
curl -X POST http://localhost:3000/api/chaos/latency -H 'Content-Type: application/json' -d '{"ms":300,"jitterMs":100}'
curl -X POST http://localhost:3000/api/chaos/failure -H 'Content-Type: application/json' -d '{"rate":1}'
curl -X POST http://localhost:3000/api/chaos/reset
```

Con Docker, ademÃƒÂ¡s puede usarse **Toxiproxy** para fallos a nivel de red
(ver [`k6/README.md`](k6/README.md)).

## Detener el entorno sin perder datos

```bash
docker compose down            # conserva el volumen finftech-data (SQLite)
# NO usar `-v`: eliminarÃƒÂ­a el volumen y la base de datos.
```

Los datos persisten en el volumen `finftech-data` (API).

## Logs y diagnÃƒÂ³stico

```bash
docker compose logs -f api        # logs JSON de la API
docker compose ps                 # estado y salud de los servicios
curl http://localhost:3000/api/services   # estado de los componentes
```

Si un servicio no arranca, revisa `docker compose logs <servicio>` antes de reintentar.

## DemostraciÃƒÂ³n acadÃƒÂ©mica

Flujo reproducible paso a paso en [`docs/demo.md`](docs/demo.md). Evidencia de las
comprobaciones ejecutadas en [`docs/verificacion.md`](docs/verificacion.md).

## Limitaciones conocidas

- **Docker no estaba disponible en el equipo de desarrollo** durante la construcciÃƒÂ³n, por lo
  que los servicios `k6`, `Toxiproxy` y `SonarQube` **no se ejecutaron**: se entregan
  configurados y documentados, pero su arranque queda **pendiente de verificaciÃƒÂ³n** en un
  entorno con Docker.
- Verificado de forma nativa: API, persistencia, idempotencia, concurrencia, ejecutor de
  pruebas, mÃƒÂ©tricas, historial, informes, CORS y servido del frontend.
- No se implementan (se muestran como *no disponibles* en la interfaz): SSO (Okta/SAML),
  webhooks, SLA guardrails, API keys/CLI y gestiÃƒÂ³n de equipos.
- No se declara cumplimiento de normas ISO: solo se aplican prÃƒÂ¡cticas tÃƒÂ©cnicas concretas.
