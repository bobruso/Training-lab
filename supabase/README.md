# Backend de Training Lab

Proyecto Supabase: `Training Lab`
Project ref: `nnpvklaxhomarxszlclt`
Región: `eu-west-1`

Este backend ya está desplegado. No hace falta volver a crearlo al publicar GitHub Pages.

## Edge Functions activas

### `analyze-fit`
- JWT obligatorio.
- Versión desplegada: v2.
- Fútbol / running: GPS, distancia, FC, zonas, velocidad, alta intensidad, sprints, aceleraciones, track y resumen.
- Fuerza: intenta leer mensajes FIT de series (`set` / `exercise_set`) y guarda repeticiones, peso y categoría cuando el dispositivo realmente los incluye.
- Nunca inventa series ausentes.

### `health-connect-ingest`
- JWT obligatorio.
- Recibe datos normalizados desde el companion Android.
- Importa sueño y sesiones de ejercicio de Health Connect.
- Actualiza el estado de sincronización.

## Automatización semanal

Cron activo: `training-lab-weekly-report`

Se ejecuta diariamente a las 12:30 UTC y la función solo genera el informe cuando, para el usuario y su zona horaria, es domingo. Para `Europe/Madrid` esto cae después de la ventana habitual de sueño 05:00–13:00.

El informe usa:
- fuerza / running / fútbol,
- carga (min × RPE),
- distancia,
- sueño,
- check-ins,
- días con proteína suficiente,
- peso.

También crea misiones de confirmación para cosas que la app no puede verificar con seguridad.

## Seguridad

- RLS por usuario en tablas expuestas.
- Bucket `fit-files` privado y separado por carpeta de usuario.
- Las Edge Functions sensibles exigen JWT.
- La función automática semanal vive en un esquema privado y no puede ser ejecutada por `anon` ni `authenticated`.
- En frontend solo se utiliza la publishable key. Nunca se debe poner una `service_role` en GitHub.

## Auth URLs que faltan configurar

Cuando exista la URL definitiva de GitHub Pages, añadir en Supabase:

Authentication → URL Configuration → Redirect URLs

- `https://TU_USUARIO.github.io/training-lab/**`
- `traininglab://auth`

La segunda URL permite que un magic link abierto desde el companion Android vuelva a la app y no deje la sesión solamente en Chrome.
