# Training Lab — informe de desarrollo autónomo

Fecha: 9 de septiembre de 2026.

## Estado final

Se ha estabilizado y publicado la aplicación en `main`, manteniendo HTML/CSS/JS vanilla, GitHub Pages y Supabase. El checkout con historial Git está en `repo/` dentro de la carpeta de trabajo: la carpeta inicial contenía una copia sin `.git`, más antigua que GitHub. Esos archivos iniciales se han conservado.

- Corregido el error sintáctico que impedía ejecutar todo `app.js` en producción.
- Login independiente del módulo: valida email, muestra progreso, usa timeout, restaura botón y muestra errores. Redirect web exacto y `traininglab://auth` para Android. Sin envíos reales de correo durante QA.
- Inicialización autenticada al final del módulo y operaciones cloud fuera del callback bloqueante de Auth. Perfil existente conservado. Caché local separada por usuario para nuevas sesiones y limpieza visual al salir.
- PWA con instalación de carcasa completa, caché por build, limpieza de versiones, `skipWaiting`, `clients.claim`, dependencias versionadas y SDK local. No cachea APIs. Recarga offline probada; aviso de actualización sin recargar formularios automáticamente.
- Diagnóstico `?debug=1`: versión, caché/worker, conectividad, sesión/email, conteos, último sync/función/error y bridge Android. Redacción de tokens en errores.
- Readiness desglosado y explícitamente orientativo. Ventana personal 05:00–13:00 ±1 h, datos recientes, baseline HRV/FC de noches anteriores y ausencia de datos visible. No se fabrica Sleep Score.
- Recuperación muscular estimada que vuelve a 100 con el tiempo; descarta series futuras y reduce doble cómputo de sesiones con series conocidas.
- Fútbol confirmado/cancelado por fecha, reducción de running con múltiples partidos y proyección semanal que no se guarda como entrenamiento realizado. No se impone fútbol por ser lunes/viernes.
- FIT con validación de ruta/ownership/cabecera/CRC, límites de tamaño, huecos temporales, últimos diez minutos y separación de sprints relativos/absolutos. Reanálisis preserva series manuales. Métricas ausentes no se inventan en el resumen del parser.
- Comparador 2–5 actividades del mismo deporte; métricas ausentes visibles, comparaciones de running a FC parecida, tracks disponibles y fuerza por ejercicio/fecha con tonelaje y 1RM orientativo.
- Hora de partido configurable persistida; sin cuenta atrás que salte a mañana. Recuperación postpartido según hora/duración disponibles. Macros consumidos/objetivo/restantes con porciones estimadas etiquetadas.
- Test diario conserva respuestas; editar sueño/check-in existente no vuelve a conceder XP. Las bonificaciones RPG siguen separadas de fisiología.
- Backend reproducible: migraciones originales recuperadas y nuevas migraciones alineadas con sus versiones desplegadas.

## Commits realizados

Todos los siguientes commits funcionales se publicaron en `main`:

| Commit | Cambio |
|---|---|
| `e6e134a` | Arranque, login resistente y carcasa PWA versionada |
| `5d9ecb8` | Migraciones históricas y errores de Health Connect |
| `0067c1d` | Readiness explicable y fútbol confirmado |
| `75de68e` | FIT robusto y fixture binario |
| `305db05` | Comparador de cinco actividades y fallos de escritura |
| `b57286f` | Hora de partido y recuperación |
| `6d0269d` | Wrapper Android, CI y bridge restringido |
| `57ee00b` | Perfiles, respuestas diarias y diagnóstico |
| `ae38616` | SDK 36 / AGP 8.10.1 / Gradle 8.11.1 |
| `6f3ddc5` | Fechas compatibles con Android 9 |
| `3a8af52` | Sueño semanal sin duplicados, HRV y molestias |
| `afc53e7` | Cache busting de todas las dependencias JS |
| `15aebd1` | Timeout Auth, redacción de tokens y escritura rechazada |

El commit de cierre añade este informe, los bloqueos y las instrucciones de pruebas/compilación.

## Tests ejecutados

- `npm run check`: PASS (incluye `node --check app.js`, runtime y worker).
- `node --test tests/*.test.mjs`: **12/12 PASS**. Sueño personal, datos ausentes/antiguos, recuperación, cuota de running, ingestión Health Connect, ownership y FIT binario con CRC válido.
- `npm test`: **18/18 PASS**, escritorio y móvil. Auth interceptada, fallos de red/rate limit/import/timeout, redacción de tokens, handlers, IDs, referencias DOM, navegación, escrituras autenticadas simuladas, rechazo de escrituras, logout, offline y comparador.
- `git diff --check`: PASS.
- Release ejecutado dos veces: mismo hash; generación determinista.
- Supabase real: pruebas RLS SELECT/INSERT/UPDATE de ownership en transacción revertida; **PASS**, cero usuarios residuales.
- Supabase real: informe de domingo con dos fuentes para la misma noche, dos ejecuciones y formato de texto; **PASS**, una noche, HRV manual correcta, un informe y cero fixtures residuales.
- Edge Functions desplegadas rechazan POST sin JWT con **401**.
- GitHub Actions: **web y Android aprobados** en [34335864031](https://github.com/bobruso/Training-lab/actions/runs/34335864031), commit `afc53e7`. Android ejecutó `:app:assembleDebug :app:lintDebug --no-daemon`; no se ha instalado el APK en un teléfono durante la sesión.

Las pruebas web autenticadas usan respuestas interceptadas. No equivalen a sesión real por correo ni a todos los flujos reales de Storage/Android.

## Supabase

Único proyecto consultado/modificado: **Training Lab — `nnpvklaxhomarxszlclt`**. Patxanguilles no se ha tocado.

- Recuperadas 12 migraciones históricas desde `supabase_migrations.schema_migrations`.
- `20260909021941_fix_health_connect_source.sql`: permite `health_connect` en `activities.source` manteniendo orígenes anteriores.
- `20260909023254_add_match_time.sql`: añade `daily_status.football_time`.
- `20260909093634_refine_weekly_report.sql`: mejora la función semanal privada; no altera horario Cron.
- `health-connect-ingest`: versión desplegada **2**, JWT obligatorio. Rechaza lotes excesivos y devuelve errores parciales; no anuncia sync correcto cuando fallan escrituras.
- `analyze-fit`: versión desplegada **3**, JWT obligatorio. Source actualizado en el repositorio.
- Tablas públicas inspeccionadas con RLS; `fit-files` privado, políticas por carpeta de usuario.
- Cron `training-lab-weekly-report` activo: `30 12 * * *` UTC. Función solo genera los domingos, después de despertar en Madrid (14:30 verano / 13:30 invierno). Unicidad por usuario/semana comprobada.
- Advisor de seguridad: único aviso existente, protección contra contraseñas filtradas desactivada. No se ha modificado ese ajuste del servicio; la app usa magic links.

## Producción

URL: `https://bobruso.github.io/Training-lab/`.

Último build funcional verificado: **v6.2 · build `33377ca86f`**. GitHub Pages API confirma `main` → `/` y estado `built`.

Verificación real en Chromium a **390 y 1440 px**: app inicializada, Supabase accesible, worker/cache coherentes, navegación por Hoy/Semana/Sueño/Comparar/Check-in/Recuperación, cero errores JS y cero desbordamientos horizontales. Evidencia local en `test-results/production.json` y PNGs. Script reproducible: `scripts/production-smoke.mjs`.

No se ha enviado ningún magic link ni almacenado entrenamientos ficticios permanentes en producción.

## Problemas encontrados

Corregidos: sintaxis inválida en correlaciones que paralizaba el módulo; dos rutas de login; inicialización antes de constantes; llamadas async dentro de Auth; caché indiscriminada sin limpieza; menú móvil oculto; sobrescritura del perfil; valores FIT `null` convertidos a cero; huecos tratados como esfuerzos; series manuales eliminables en reanálisis; Health Connect incompatible con constraint de origen; sync parcial anunciado como correcto; cuentas atrás que saltaban a mañana; sueño semanal contado por fuente; saltos de línea literales; incompatibilidad inicial de AGP/SDK y API de fechas Android.

Hubo un rechazo temporal de la revisión automática de Codex por cuota al consultar CI. El acceso se restableció posteriormente; se reanudaron pushes y consultas.

## Bloqueos

Ver `CODEX_BLOCKERS.md`: validación física Android/COROS, entrega real del magic link/allowlist Auth y FIT reales del reloj.

## Próximas prioridades

1. Validar login real y FIT reales de los tres deportes, permisos/sync de Android y corrección de métricas contra el dispositivo.
2. Añadir cola fiable de escrituras offline y resolución de conflictos; el modo local actual no garantiza reenvío automático de todos los registros pendientes.
3. Ampliar pruebas RLS de todas las tablas/Storage y pruebas de concurrencia/reintento del parser. El flujo FIT todavía usa varias escrituras, no una transacción única.
4. Refinar periodización de fuerza por músculos y horas exactas, seguimiento de sesiones desplazadas y tiempos futuros de partido.
5. Completar Health Connect: paginación, permisos parciales, deduplicación entre apps proveedoras y métricas en intervalos solapados.
6. Mejorar correlaciones con emparejamiento temporal estricto, tamaño de muestra y control de condiciones; ampliar informe semanal con tendencias y resumen nutricional completo.
7. Edición de porciones/macros y registro postpartido; accesibilidad de formularios y reducción de ruido en Hoy.
8. RPG: recompensas transaccionales/idempotentes y misiones verificables, sin afectar fisiología.

## Riesgos técnicos

Los scores son heurísticas transparentes, no mediciones fisiológicas validadas. La recuperación genérica de una sesión sin series detalladas es aproximada. Las porciones sugeridas no miden la ingesta real. El histórico local previo a esta sesión no tiene identificación de propietario y se ha conservado sin migrarlo automáticamente entre cuentas. La aplicación sigue concentrada en un módulo grande; las nuevas reglas puras viven en `domain.js` y tienen tests. No se ha completado todo el alcance P0–P10: se priorizó estabilidad, backend y funcionalidades deportivas comprobables.

## Validación con el usuario presente

El usuario confirma recepción y retorno del magic link en web. Se ejecutó el handler local con un FIT real de fútbol COROS, con CRC estricto: procesamiento correcto, 3614 muestras y track disponible. Distancia, tiempo y FC coinciden con el resumen incluido en el archivo. No se ha importado el archivo a Supabase ni se han publicado sus coordenadas. Se añadió `scripts/inspect-fit.mjs` para repetir esta comprobación con archivos privados. Falta validación de la subida autenticada y FIT de running/fuerza.

## FIT sin sesión

Se permite analizar en el navegador sin iniciar sesión. El resultado se muestra sin persistir en cuenta; con sesión continúa el flujo privado de Storage y Edge Function. Parser local generado desde los cálculos del handler existente mediante `node scripts/build-fit-local.mjs`; regenerarlo cuando cambie `analyze-fit` y ejecutar después `npm run release`. El bundle forma parte del cache versionado. Validación: 20 pruebas de navegador (móvil/escritorio), 12 pruebas Node y FIT privado real con métricas idénticas al handler. Backend y RLS sin cambios.

## Acceso con contraseña

Añadidos Entrar, Crear cuenta, Olvidé mi contraseña y Guardar contraseña para sesiones abiertas. Las cuentas que usaban magic link pueden establecer contraseña desde su sesión existente sin perder datos. El acceso usa signInWithPassword y conserva la sesión del WebView; no depende del retorno desde el correo. Registro y recuperación usan redirect web, donde se puede confirmar/guardar contraseña y después entrar en Android. Supabase settings verificados: email habilitado, registro habilitado, confirmación email obligatoria. No se ha cambiado Auth, RLS ni límites de correo. Los límites 429 siguen aplicándose y se explican; no se enviaron correos en QA. 24 pruebas Playwright y 12 Node pasan, con login/registro/recuperación/password update simulados y persistencia al recargar. Pendiente prueba real de contraseña en el teléfono.

## Confirmación de contraseña y errores de acceso

Corregida la pérdida de confirmación al recibir USER_UPDATED: el resultado permanece fuera del formulario que se vuelve a renderizar. Los errores Auth ya no quedan tapados por la alerta genérica HTTP 400; se muestran mensajes para credenciales incorrectas, contraseña repetida, confirmación y límites. Comprobación de cuenta solicitada: correo confirmado y contraseña existente, sin leer hashes ni secretos. El motivo del rechazo concreto en el móvil aún requiere reintento con feedback actualizado. 24 tests de navegador pasan; añadidas aserciones para persistencia del mensaje y ausencia de alerta genérica.

## Reinicio de cuentas autorizado — 2026-09-09

Por confirmación explícita del usuario, eliminadas las dos cuentas existentes SOLO en Training Lab (`nnpvklaxhomarxszlclt`). Operación transaccional acotada a los dos UUID y emails previamente comprobados; las claves foráneas ON DELETE CASCADE eliminaron datos asociados y sesiones. Verificación posterior: 0 cuentas, 0 actividades, 0 registros fit_files. No se modificó esquema ni RLS, ni Patxanguilles. No es una migración que deba repetirse en despliegues.

Limitación: permanece el binario FIT huérfano en Storage privado. La eliminación de metadatos SQL no elimina el objeto físico; se requiere borrado mediante Storage API/dashboard. No se borraron metadatos de Storage para fingir la eliminación física. Las nuevas cuentas tendrán UUID distinto y no podrán acceder al objeto por las políticas de ownership. Las sesiones/caches locales de los dispositivos deben cerrarse antes de registrar de nuevo. El reinicio de cuentas no restablece cuotas de envío de correo.

## Registro sin dependencia de correos — verificación real

Configuración observada en el panel y endpoint Auth de Training Lab: registro habilitado, email habilitado, mailer_autoconfirm=true (Confirm email desactivado). Esta sesión no cambió el ajuste: ya estaba así al inspeccionarlo. Para reproducir el estado de Auth: Authentication → Sign In / Providers → Confirm email OFF. Autenticación por contraseña y RLS se mantienen; no se verifica propiedad del correo al registrar.

Eliminados botón y handler de magic link; formulario de acceso exclusivamente con contraseña y recuperación. Prueba REAL contra Training Lab con credenciales aleatorias temporales: signUp devuelve sesión inmediatamente, signOut, signInWithPassword correcto, signOut. Cuenta QA eliminada por UUID y verificación cero residuos. No se enviaron emails. 20 tests de navegador pasan tras retirar tests obsoletos de magic link; se mantienen casos contraseña/registro/recuperación y persistencia móvil.
