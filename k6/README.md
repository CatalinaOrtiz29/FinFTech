# FinFTech - Pruebas de carga y tolerancia a fallos (k6)

Contiene un escenario unificado (`run-scenario.js`) que se selecciona con la variable
`K6_SCENARIO`. Mide latencia (P95/P99), throughput, tasa de errores y validaciones
funcionales, y aplica umbrales configurables por variable de entorno.

## Escenarios

| K6_SCENARIO           | Objetivo | Fallo inyectado |
|-----------------------|----------|-----------------|
| `functional`          | Verifica `/health`, `/login` y `/transfer` | Ã¢â‚¬â€ |
| `load`                | Carga normal sostenida | Ã¢â‚¬â€ |
| `concurrency`         | Concurrencia elevada (50+ VUs) | Ã¢â‚¬â€ |
| `ramp`                | Incremento gradual (ramping-vus) | Ã¢â‚¬â€ |
| `idempotency`         | Reintentos e idempotencia (25 iteraciones, 1 VU) | Ã¢â‚¬â€ |
| `latency`             | Latencia elevada | AplicaciÃƒÂ³n (`/api/chaos/latency`) |
| `outage`              | InterrupciÃƒÂ³n de conectividad | AplicaciÃƒÂ³n (`/api/chaos/failure`) |
| `recovery`            | RecuperaciÃƒÂ³n tras fallo | AplicaciÃƒÂ³n, retirado a mitad |
| `toxiproxy-baseline`  | LÃƒÂ­nea base a travÃƒÂ©s del proxy de red | Ã¢â‚¬â€ |
| `toxiproxy-latency`   | Latencia de **red** | Toxiproxy (toxic `latency`) |
| `toxiproxy-bandwidth` | Ancho de banda limitado de **red** | Toxiproxy (toxic `bandwidth`) |
| `toxiproxy-outage`    | Corte de **red** | Toxiproxy (proxy deshabilitado) |
| `toxiproxy-recovery`  | RecuperaciÃƒÂ³n de **red** | Proxy deshabilitado y rehabilitado a mitad |

Los escenarios `latency`, `outage` y `recovery` usan el mecanismo **interno** de la
aplicaciÃƒÂ³n (`/api/chaos/*`), que funciona incluso sin Docker. Los escenarios
`toxiproxy-*` envÃƒÂ­an el trÃƒÂ¡fico **a travÃƒÂ©s del proxy de red** (`K6_PROXY_URL`) y el fallo
lo inyecta Toxiproxy: son fallos de red reales y sirven para comparar ambos planos.

## EjecuciÃƒÂ³n con Docker (recomendado)

```bash
# Levantar el laboratorio (api + frontend + toxiproxy)
docker compose up --build -d

# Prueba funcional
K6_SCENARIO=functional docker compose --profile load run --rm k6-run

# Carga normal con umbrales
K6_SCENARIO=load K6_LOAD_VUS=20 K6_LOAD_DURATION=30s docker compose --profile load run --rm k6-run

# Concurrencia elevada
K6_SCENARIO=concurrency docker compose --profile load run --rm k6-run

# Idempotencia
K6_SCENARIO=idempotency docker compose --profile load run --rm k6-run

# Fallo a nivel de aplicaciÃƒÂ³n
K6_SCENARIO=latency  docker compose --profile load run --rm k6-run
K6_SCENARIO=outage   docker compose --profile load run --rm k6-run
K6_SCENARIO=recovery docker compose --profile load run --rm k6-run

# Fallo a nivel de RED (a travÃƒÂ©s de Toxiproxy)
K6_SCENARIO=toxiproxy-baseline  docker compose --profile load run --rm k6-run
K6_SCENARIO=toxiproxy-latency   docker compose --profile load run --rm k6-run
K6_SCENARIO=toxiproxy-bandwidth docker compose --profile load run --rm k6-run
K6_SCENARIO=toxiproxy-outage    docker compose --profile load run --rm k6-run
K6_SCENARIO=toxiproxy-recovery  docker compose --profile load run --rm k6-run
```

Los resultados se conservan **por escenario** en `k6/results/` (ignorado por Git):

- `stream-<escenario>.json` Ã¢â‚¬â€ flujo crudo de mÃƒÂ©tricas.
- `summary-<escenario>.json` Ã¢â‚¬â€ resumen agregado (percentiles, throughput, umbrales).

> **Importante**: no uses los nombres `K6_VUS` ni `K6_DURATION`. k6 los interpreta como
> opciones globales y **sobrescriben** las opciones por escenario del script (por ejemplo,
> `idempotency` declara `vus: 1` e `iterations: 25`). Este proyecto usa
> `K6_LOAD_VUS` y `K6_LOAD_DURATION`.

## EjecuciÃƒÂ³n local (sin Docker) con la API en marcha

```bash
K6_BASE_URL=http://localhost:3000 K6_SCENARIO=load k6 run k6/run-scenario.js
```

## Variables de entorno

| Variable | Por defecto | DescripciÃƒÂ³n |
|----------|-------------|-------------|
| `K6_SCENARIO` | `load` | Escenario a ejecutar. |
| `K6_BASE_URL` | `http://localhost:3000` | API destino (`http://api:3000` en Docker). |
| `K6_PROXY_URL` | `http://toxiproxy:8666` | Proxy de red para los escenarios `toxiproxy-*`. |
| `K6_LOAD_VUS` | `10` | VUs de los escenarios de carga. |
| `K6_LOAD_DURATION` | `15s` | DuraciÃƒÂ³n de los escenarios de carga. |
| `K6_P95_MS` / `K6_ERROR_RATE` | `800` / `0.01` | Umbrales de latencia y errores. |
| `K6_RAMP` | `10s` | DuraciÃƒÂ³n de cada etapa del escenario `ramp`. |
| `TOXIPROXY_ADMIN` | `http://toxiproxy:8474` | API administrativa de Toxiproxy. |
| `TOXIPROXY_PROXY` | `finftech_api` | Nombre del proxy gestionado. |
| `K6_TOXIPROXY_LATENCY_MS` / `K6_TOXIPROXY_JITTER_MS` | `300` / `0` | Toxic de latencia. |
| `K6_TOXIPROXY_RATE_KB` | `4` | Toxic de ancho de banda. |

## Fallos a nivel de red con Toxiproxy

El proxy `finftech_api` escucha en `0.0.0.0:8666` y su upstream es `api:3000`
(`toxiproxy/toxiproxy.json`). La interfaz administrativa se publica ÃƒÂºnicamente en
`127.0.0.1:8474`.

```bash
# AÃƒÂ±adir 400 ms de latencia al proxy de la API
curl -s -X POST http://localhost:8474/proxies/finftech_api/toxics \
  -H 'Content-Type: application/json' \
  -d '{"name":"latency","type":"latency","attributes":{"latency":400,"jitter":100}}'

# Interrumpir la conectividad (deshabilita el proxy)
curl -s -X POST http://localhost:8474/proxies/finftech_api -H 'Content-Type: application/json' -d '{"enabled":false}'

# Restaurar
curl -s -X POST http://localhost:8474/proxies/finftech_api -H 'Content-Type: application/json' -d '{"enabled":true}'
curl -s -X DELETE http://localhost:8474/proxies/finftech_api/toxics/latency
```

Los escenarios `toxiproxy-*` restauran **siempre** el proxy y eliminan los tÃƒÂ³xicos en su
`teardown()`, de modo que el laboratorio queda en estado sano aunque la prueba falle.
