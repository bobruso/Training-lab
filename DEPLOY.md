# Despliegue v6

## 1. GitHub Pages

Repositorio: `bobruso/Training-lab`

URL publicada:

`https://bobruso.github.io/Training-lab/`

La web se sirve desde `main` → `/ (root)`.

## 2. Supabase Auth

En Supabase:

Authentication → URL Configuration

Configura:

**Site URL**

`https://bobruso.github.io/Training-lab/`

**Redirect URLs**

- `https://bobruso.github.io/Training-lab/`
- `traininglab://auth`

Usamos la URL exacta en producción. La primera permite que el magic link vuelva correctamente a GitHub Pages. La segunda permite que, desde el companion Android, el magic link vuelva a la app en lugar de quedarse en Chrome.

## 3. Primera prueba web

- Solicita el magic link.
- Registra peso y fatiga.
- Sube un FIT de fútbol.
- Comprueba `Progreso`.
- Haz un check-in.
- Añade/sincroniza sueño.

## 4. Companion Android / Health Connect

La URL del companion ya está configurada en:

`android-companion/app/src/main/res/values/strings.xml`

con:

`https://bobruso.github.io/Training-lab/`

Abre la carpeta `android-companion` con Android Studio y compila.

En Android, configura COROS → Perfil → Configuración → Apps de terceros → Sincronización de datos → Health Connect y habilita los tipos de datos que quieras compartir.

## 5. Limitaciones conocidas

- La integración COROS directa vía API todavía no está autorizada. Health Connect es el puente previsto en Android.
- El companion Android se entrega como código fuente y debe compilarse/probarse en Android Studio.
- Los FIT de fuerza solo mostrarán series/repeticiones/peso si el archivo realmente contiene esos mensajes.
- Las correlaciones de sueño, dieta y rendimiento necesitan varias semanas de datos y no implican causalidad.
