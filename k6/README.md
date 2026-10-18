# FinFTech - Pruebas de carga y tolerancia a fallos (k6)

Contiene un escenario unificado (`run-scenario.js`) que se selecciona con la variable
`K6_SCENARIO`. Mide latencia (P95/P99), throughput, tasa de errores y validaciones
funcionales, y aplica umbrales configurables por variable de entorno.

## Escenarios

| K6_SCENARIO   | Objetivo | Fallo inyectado |
|---------------|----------|-----------------|
| `functional`  | Verifica `/health`, `/login` y `/transfer` | Ã¢â‚¬â€ |
| `load`        | Carga normal sostenida | Ã¢â‚¬â€ |
| `concurrency` | Concurrencia elevada (50+ VUs) | Ã¢â‚¬â€ |
| `ramp`        | Incremento gradual (ramping-vus) | Ã¢â‚¬â€ |
| `latency`     | Latencia elevada | Latencia en la aplicaciÃƒÂ³n (o Toxiproxy) |
| `outage`      | InterrupciÃƒÂ³n de conectividad | Fallo total de la aplicaciÃƒÂ³n (o corte de red) |
| `recovery`    | RecuperaciÃƒÂ³n tras fallo | Fallo retirado a mitad de la ejecuciÃƒÂ³n |
| `idempotency` | Reintentos e idempotencia | Ã¢â‚¬â€ |

## EjecuciÃƒÂ³n con Docker (recomendado)

```bash
# Levantar el laboratorio
docker compose up --build -d

# Prueba funcional
K6_SCENARIO=functional docker compose --profile load run --rm k6-run

# Carga normal con umbrales
K6_SCENARIO=load K6_VUS=20 K6_DURATION=30s docker compose --profile load run --rm k6-run

# Concurrencia elevada
K6_SCENARIO=concurrency docker compose --profile load run --rm k6-run

# Latencia e interrupciÃƒÂ³n
K6_SCENARIO=latency docker compose --profile load run --rm k6-run
K6_SCENARIO=outage docker compose --profile load run --rm k6-run
K6_SCENARIO=recovery docker compose --profile load run --rm k6-run

# Idempotencia
K6_SCENARIO=idempotency docker compose --profile load run --rm k6-run
```

Los resultados JSON se guardan en `k6/results/result.json` (ignorado por Git).

## EjecuciÃƒÂ³n local (sin Docker) con la API en marcha

```bash
K6_BASE_URL=http://localhost:3000 K6_SCENARIO=load k6 run k6/run-scenario.js
```

## Fallos a nivel de red con Toxiproxy

`lib/toxiproxy.js` expone helpers (`addLatency`, `disableProxy`, `clearToxics`, Ã¢â‚¬Â¦) que
operan sobre la API administrativa de Toxiproxy. La interfaz administrativa se publica
ÃƒÂºnicamente en `127.0.0.1:8474`.

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

> Los escenarios k6 usan por defecto la inyecciÃƒÂ³n a nivel de aplicaciÃƒÂ³n
> (`/api/chaos/*`), que funciona incluso sin Docker. La inyecciÃƒÂ³n a nivel de red con
> Toxiproxy es un complemento para reproducir cortes reales de conexiÃƒÂ³n.
