# DemostraciÃƒÂ³n acadÃƒÂ©mica Ã¢â‚¬â€ FinFTech

Flujo reproducible para exponer el laboratorio. Cada paso indica el comando y el resultado
esperado. Los pasos marcados con Ã°Å¸Â³ requieren Docker; el resto funciona tambiÃƒÂ©n sin Docker.

## 0. Requisitos

- Docker + Docker Compose (para el flujo completo), o Node.js Ã¢â€°Â¥ 22.5.
- Copia `.env.example` a `.env` y ajusta `TOKEN_SECRET` y `ADMIN_PASSWORD`.

## 1. Levantar el laboratorio Ã°Å¸Â³

```bash
docker compose up --build -d
docker compose ps
```

Espera a que `finftech-api` estÃƒÂ© `healthy`. Frontend en http://localhost:8080 y API en
http://localhost:3000.

> Sin Docker: `cd backend && npm ci && npm start` y `cd frontend && npm run build && npm start`.

## 2. Verificar la API

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/services
```

Resultado esperado: `status: healthy`, `database: ok` y el listado de componentes. Con
Docker en marcha, `k6` y `toxiproxy` tambiÃƒÂ©n aparecen como `ok` (el estado de Toxiproxy se
sondea de verdad contra `http://toxiproxy:8474`); sin Docker aparecen como `external`.

## 3. Prueba funcional (desde la interfaz o k6)

- Interfaz: *Test Lab* Ã¢â€ â€™ escenario **Prueba funcional** Ã¢â€ â€™ *Lanzar experimento*.
- k6 Ã°Å¸Â³: `K6_SCENARIO=functional docker compose --profile load run --rm k6-run`

Resultado esperado: `checks` y endpoints sin errores.

## 4. Prueba de carga

- Interfaz: *Test Lab* Ã¢â€ â€™ **Carga normal** (VUs 10Ã¢â‚¬â€œ20, 15Ã¢â‚¬â€œ30 s).
- k6 Ã°Å¸Â³: `K6_SCENARIO=load K6_LOAD_VUS=20 K6_LOAD_DURATION=30s docker compose --profile load run --rm k6-run`

Observa en *Performance overview* y *Live runs*: rps, P95/P99 y tasa de errores reales.

## 5. Concurrencia elevada

- Interfaz: *Test Lab* Ã¢â€ â€™ **Concurrencia elevada** (50 VUs).
- k6 Ã°Å¸Â³: `K6_SCENARIO=concurrency docker compose --profile load run --rm k6-run`

## 6. Introducir latencia

- Interfaz: *Settings* Ã¢â€ â€™ *InyecciÃƒÂ³n de fallos* Ã¢â€ â€™ latencia 300 ms + jitter 100 ms Ã¢â€ â€™ *Aplicar latencia*.
- API: `curl -X POST http://localhost:3000/api/chaos/latency -H 'Content-Type: application/json' -d '{"ms":300,"jitterMs":100}'`
- k6 Ã°Å¸Â³: `K6_SCENARIO=latency docker compose --profile load run --rm k6-run`

Observa cÃƒÂ³mo sube la latencia P95/P99 en las mÃƒÂ©tricas.

## 7. Simular un fallo de conectividad

- Interfaz: *Settings* Ã¢â€ â€™ *Aplicar fallo* con tasa 1.
- API: `curl -X POST http://localhost:3000/api/chaos/failure -H 'Content-Type: application/json' -d '{"rate":1}'`
- k6 Ã°Å¸Â³: `K6_SCENARIO=outage docker compose --profile load run --rm k6-run`

Resultado esperado: la tasa de errores se dispara y el escenario `outage` lo registra
(`fault_reproduced`).

## 8. Restaurar y medir la recuperaciÃƒÂ³n

- Interfaz: *Settings* Ã¢â€ â€™ *Restaurar normal*.
- k6 Ã°Å¸Â³: `K6_SCENARIO=recovery docker compose --profile load run --rm k6-run`

El escenario `recovery` comprueba dos cosas: que el fallo se observÃƒÂ³ en la primera mitad y
que la tasa de error vuelve a ~0 tras retirarlo (`recovered`).

## 9. Demostrar idempotencia

```bash
# misma clave, misma solicitud, dos veces
curl -X POST http://localhost:3000/transfer -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-0001' -d '{"from":"acc_alice","to":"acc_bob","amount":1.5}'
curl -X POST http://localhost:3000/transfer -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-0001' -d '{"from":"acc_alice","to":"acc_bob","amount":1.5}'
```

La primera responde `201`; la segunda `200` con `idempotentReplay: true` y el **mismo id**.
Cambiar el `amount` con la misma clave responde `409`.

- Interfaz: *Test Lab* Ã¢â€ â€™ **Reintentos e idempotencia** Ã¢â€ â€™ verifica `single_effect`.
- k6 Ã°Å¸Â³: `K6_SCENARIO=idempotency docker compose --profile load run --rm k6-run`

## 10. Mostrar mÃƒÂ©tricas, historial, comparaciÃƒÂ³n e informes

- *History & Reports*: filtros, detalle (*Ver reporte*), **Comparar recientes** y exportaciÃƒÂ³n.
- API:
  - `GET /api/runs/:id/report.json` y `GET /api/runs/:id/report.csv`
  - `GET /api/history/export.csv` y `GET /api/history/export.json`
  - `GET /api/history/compare?ids=<id1>,<id2>`

## 11. Fallos a nivel de RED con Toxiproxy Ã°Å¸Â³

A diferencia de `/api/chaos/*` (fallo dentro de la aplicaciÃƒÂ³n), aquÃƒÂ­ el trÃƒÂ¡fico atraviesa el
proxy de red y el fallo lo inyecta Toxiproxy.

```bash
# LÃƒÂ­nea base: mismo camino (proxy) sin tÃƒÂ³xicos
K6_SCENARIO=toxiproxy-baseline docker compose --profile load run --rm k6-run

# Latencia de red (toxic latency, 300 ms)
K6_SCENARIO=toxiproxy-latency  docker compose --profile load run --rm k6-run

# Ancho de banda limitado (toxic bandwidth)
K6_SCENARIO=toxiproxy-bandwidth docker compose --profile load run --rm k6-run

# Corte de red y recuperaciÃƒÂ³n
K6_SCENARIO=toxiproxy-outage   docker compose --profile load run --rm k6-run
K6_SCENARIO=toxiproxy-recovery docker compose --profile load run --rm k6-run
```

ComprobaciÃƒÂ³n manual (mientras el tÃƒÂ³xico estÃƒÂ¡ activo):

```bash
curl -s http://localhost:8474/proxies                                                  # proxy y tÃƒÂ³xicos
curl -s -o /dev/null -w '%{time_total}s\n' http://localhost:8666/health                # a travÃƒÂ©s del proxy
curl -s -o /dev/null -w '%{time_total}s\n' http://localhost:3000/health                # directo (comparaciÃƒÂ³n)
```

Resultado esperado: con el tÃƒÂ³xico de latencia, la peticiÃƒÂ³n por el proxy tarda ~300 ms mÃƒÂ¡s que
la directa; con el proxy deshabilitado, la primera falla y la segunda sigue respondiendo.
Los escenarios `toxiproxy-*` **siempre** restauran el proxy en su `teardown()`.

## 12. AnÃƒÂ¡lisis estÃƒÂ¡tico con SonarQube Ã°Å¸Â³

```bash
docker compose --profile quality up -d          # http://localhost:9000
# generar cobertura LCOV y ejecutar el escÃƒÂ¡ner (ver README.md Ã¢â€ â€™ AnÃƒÂ¡lisis estÃƒÂ¡tico)
docker compose --profile quality run --rm -e SONAR_TOKEN="<token>" sonar-scanner
```

Resultado esperado: anÃƒÂ¡lisis `EXECUTION SUCCESS` y *quality gate* del proyecto consultable en
la interfaz o por API.

## 13. Detener el entorno conservando datos

```bash
docker compose down      # conserva el volumen finftech-data
```
