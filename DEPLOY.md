# Despliegue v6

## 1. GitHub Pages

Crea un repositorio nuevo, por ejemplo `training-lab`.

Sube **el contenido de este ZIP a la raíz**, conservando las carpetas.

En GitHub:

1. Settings
2. Pages
3. Source → Deploy from a branch
4. Branch → `main`
5. Folder → `/ (root)`

## 2. Supabase Auth

Cuando GitHub muestre la URL final, por ejemplo:

`https://TU_USUARIO.github.io/training-lab/`

añade en Supabase:

Authentication → URL Configuration → Redirect URLs

- `https://TU_USUARIO.github.io/training-lab/**`
- `traininglab://auth`

## 3. Primera prueba web

- Solicita el magic link.
- Registra peso y fatiga.
- Sube un FIT de fútbol.
- Comprueba `Progreso`.
- Haz un check-in.
- Añade/sincroniza sueño.

## 4. Companion Android / Health Connect

Cambia la URL de:

`android-companion/app/src/main/res/values/strings.xml`

Abre la carpeta `android-companion` con Android Studio y compila.

En Android, configura COROS → Perfil → Configuración → Apps de terceros → Sincronización de datos → Health Connect y habilita los tipos de datos que quieras compartir.

## 5. Limitaciones conocidas

- La integración COROS directa vía API todavía no está autorizada. Health Connect es el puente previsto en Android.
- El companion Android se entrega como código fuente y debe compilarse/probarse en Android Studio.
- Los FIT de fuerza solo mostrarán series/repeticiones/peso si el archivo realmente contiene esos mensajes.
- Las correlaciones de sueño, dieta y rendimiento necesitan varias semanas de datos y no implican causalidad.
