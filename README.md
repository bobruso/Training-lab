# Training Lab

Web personal adaptativa para combinar fútbol, fuerza, running, nutrición, recuperación y análisis de archivos FIT.

## Estado actual

- Plan diario adaptativo según día, fatiga, descansos y pachangas.
- 3 sesiones de fuerza + 2 estímulos aeróbicos como objetivos desplazables.
- Pachangas tratadas como eventos fijos.
- Nutrición periodizada según carga.
- Registro de peso y actividades.
- Login por email con Supabase.
- Datos sincronizados entre dispositivos.
- Bucket FIT privado por usuario.
- Análisis automático de FIT mediante Supabase Edge Function `analyze-fit`.
- Métricas: distancia, tiempo, moving time, FC, zonas FC, velocidad, velocidad robusta, alta intensidad, sprints relativos, sprints >18 km/h, aceleraciones/deceleraciones, primeros 10 min y track GPS.
- Resumen automático y vista heatmap relativa.

## GitHub Pages

1. Crea un repositorio nuevo, por ejemplo `training-lab`.
2. Sube **todo el contenido de esta carpeta a la raíz** del repositorio.
3. En GitHub: Settings → Pages.
4. Source: `Deploy from a branch`.
5. Branch: `main`, carpeta `/ (root)`.
6. Guarda y abre la URL que proporciona GitHub Pages.

No hace falta ejecutar npm ni compilar nada.

## Supabase

El frontend ya apunta al proyecto separado `Training Lab`.

La clave incluida en `app.js` es una **publishable key de frontend**, no una `service_role`.

El backend ya tiene RLS y el bucket `fit-files` es privado.

### Importante para el login por email

Cuando conozcas la URL definitiva de GitHub Pages, añádela en Supabase:

Authentication → URL Configuration → Redirect URLs

Ejemplo:

`https://TU_USUARIO.github.io/training-lab/**`

Así los magic links pueden volver correctamente a la aplicación.

## Primer FIT

Para hacer la primera prueba completa:

1. Abre la web publicada.
2. Inicia sesión con tu email.
3. Sube un `.fit` de una pachanga.
4. Espera a que aparezca `Analizado`.
5. En **Progreso** aparecerán el informe y el track/heatmap.

## Seguridad

No subas nunca al repositorio:
- `service_role`
- secret keys
- contraseñas de base de datos
- JWT privados

La web solo contiene la publishable key permitida para cliente.
