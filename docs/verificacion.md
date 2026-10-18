# VerificaciÃƒÂ³n Ã¢â‚¬â€ FinFTech

Evidencia de las comprobaciones **realmente ejecutadas** durante la construcciÃƒÂ³n, con
entorno: Windows, Node v24.21.0, npm 11.19.0, git 2.55.0. **Docker no estaba instalado**, por
lo que los componentes que dependen de Docker quedan pendientes de verificaciÃƒÂ³n (se indica
en cada caso).

## Resumen

| Ãƒrea | Estado |
|------|--------|
| API (health, auth, transferencias) | Ã¢Å“â€¦ Ejecutada y verificada |
| Persistencia SQLite | Ã¢Å“â€¦ Verificada |
| Idempotencia + concurrencia | Ã¢Å“â€¦ Verificada (pruebas + HTTP) |
| Ejecutor de pruebas y escenarios | Ã¢Å“â€¦ Verificado (8 escenarios, criterios reales) |
| MÃƒÂ©tricas, historial, informes, comparaciÃƒÂ³n | Ã¢Å“â€¦ Verificados |
| CORS frontend Ã¢â€ â€ API | Ã¢Å“â€¦ Verificado |
| Build y servido del frontend | Ã¢Å“â€¦ Verificado (9 pÃƒÂ¡ginas, assets) |
| Pruebas automatizadas | Ã¢Å“â€¦ 13/13 |
| Docker Compose (api/frontend/toxiproxy/k6/sonar) | Ã¢Â³ Configurado; arranque no verificado (sin Docker) |
| k6 (contenedor) | Ã¢Â³ Scripts vÃƒÂ¡lidos; ejecuciÃƒÂ³n no verificada (sin Docker) |
| Toxiproxy | Ã¢Â³ Configurado; no ejecutado (sin Docker) |
| SonarQube | Ã¢Â³ Perfil opcional; no ejecutado (sin Docker) |

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
ChaosCore restante en public/: ninguna apariciÃƒÂ³n

$ (servidor estÃƒÂ¡tico) 
200 /  200 /dashboard.html  200 /test-lab.html  200 /live-runs.html  200 /history.html
200 /settings.html  200 /sign-in.html  200 /sign-up.html  200 /profile.html
200 /assets/js/app.js  200 /assets/js/pages.js  200 /assets/css/finftech.css
```

### ComparaciÃƒÂ³n
```
GET /api/history/compare?ids=run_A,run_B
{"deltas":{"p95Pct":167.9,"errorRatePct":-100,"rpsPct":-41.4}}
```

## Pendiente de verificaciÃƒÂ³n (requiere Docker)

1. `docker compose up --build -d` y estado `healthy` de los servicios.
2. EjecuciÃƒÂ³n de los 8 escenarios k6 en contenedor.
3. InyecciÃƒÂ³n de fallos de red con Toxiproxy y su restauraciÃƒÂ³n.
4. AnÃƒÂ¡lisis estÃƒÂ¡tico con SonarQube (perfil `quality`).

## Login responsive Ã¢â‚¬â€ verificaciÃƒÂ³n con Edge headless

VerificaciÃƒÂ³n automatizada de `sign-in.html` con Microsoft Edge en modo headless
(`puppeteer-core`) en cuatro resoluciones. En las cuatro, Tailwind quedÃƒÂ³ aplicado
(`main` en `display: grid`) y **no hubo desbordamiento horizontal**
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
