# Verificación reproducible

Requiere Node 24. La web publicada sigue siendo HTML/CSS/JS estático: npm es únicamente para desarrollo.

```sh
npm ci
npx playwright install chromium
npm run check
node --test tests/*.test.mjs
npm test
```

En el sandbox Windows de esta sesión:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers"
npm ci --cache .npm-cache
npx --cache .npm-cache playwright install chromium
npm test
```

Playwright intercepta Auth/Supabase: no manda magic links, no necesita credenciales reales ni escribe en producción. Comprueba navegación, IDs duplicados, referencias DOM, handlers inline, móvil/escritorio, login correcto/error/red/Android, arranque autenticado, escrituras, salida de sesión, caché offline, fútbol confirmado y comparación de cinco sesiones. Node usa reloj fijo y un FIT binario sintético con CRC válido y el parser real.

La prueba RLS ejecutada en Supabase usó dos usuarios efímeros dentro de una transacción revertida. Comprobó SELECT, INSERT ajeno y cambio de ownership en `daily_status`; se verificó que no quedaron usuarios de prueba. No equivale a una prueba completa de todas las tablas.

## Release y caché

```sh
npm run release
npm run check
node --test tests/*.test.mjs
npm test
git diff --check
```

El release calcula un hash del HTML, JS, CSS, SDK, manifest, privacidad y plantilla del service worker. Actualiza build visible, URLs de assets y caché. Ejecutarlo al cambiar estos archivos. Commitear `index.html` y `service-worker.js` generados junto con el código.

Al actualizar la versión fijada de Supabase, regenerar el SDK local con `node scripts/release.mjs --vendor`. `vendor/supabase.js` permite arrancar sin esm.sh; no contiene claves privadas.

El worker instala la carcasa completa, activa con `skipWaiting`, reclama clientes y elimina cachés anteriores de Training Lab. Sirve navegación y assets del mismo build; no cachea APIs. Cuando documento y worker difieren, invita a guardar y recargar. No recarga automáticamente sobre un formulario abierto.

## Producción, solo lectura

```sh
node scripts/production-smoke.mjs
```

Comprueba la web real a 390 y 1440 px y deja evidencia en `test-results/` (ignorado por Git). Abrir `https://bobruso.github.io/Training-lab/?debug=1` para versión, caché, conectividad, sesión, conteos y último error.

Quedan fuera: entrega real de correo, allowlist de Auth, FIT reales del PACE 4 y permisos/sync del teléfono. Véase `CODEX_BLOCKERS.md`.

## Validación manual de un FIT privado

Ejecutar `node scripts/inspect-fit.mjs "RUTA_AL_ARCHIVO.fit"` desde la raíz. Usa el parser real y el handler de producción con Storage y base de datos simulados en memoria: no sube archivos ni escribe en Supabase. La salida contiene métricas personales; no publicarla ni añadir el FIT a Git. No valida JWT real, RLS ni el flujo de subida. La FC máxima del perfil no se simula: las zonas resultantes son estimadas.

Si se modifica el cálculo de `supabase/functions/analyze-fit/index.ts`, regenerar `vendor/fit-local.js` con `node scripts/build-fit-local.mjs`, ejecutar `npm run release` y probar `tests/fit-local.spec.js`. La prueba verifica análisis sin sesión y cero escrituras de red, además de errores por FIT corrupto.
