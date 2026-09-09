# Training Lab v6

Training Lab es una app personal adaptativa para combinar:

- fútbol,
- fuerza / hipertrofia,
- running aeróbico,
- sueño y HRV,
- alimentación,
- recuperación,
- molestias,
- seguimiento FIT,
- gamificación personal.

El principio de la app es sencillo: **la Home debe decir qué conviene hacer hoy, qué comer y qué necesita atención**, usando lo que realmente ha ocurrido durante la semana.

## Web

La raíz del repositorio es una web estática compatible con GitHub Pages:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `privacy.html`
- `.nojekyll`

No necesita npm, Vite ni compilación.

## Funciones principales

### Hoy
- día y hora reales;
- ingesta que corresponde por horario;
- entrenamiento recomendado;
- pachanga sí/no;
- botón `HOY DESCANSO`;
- readiness;
- sueño reciente;
- mapa de recuperación;
- tareas prioritarias;
- modo día de partido.

### Planificador adaptativo
Las pachangas son eventos fijos. Fuerza y running se pueden recolocar según:
- sesiones ya realizadas,
- fatiga,
- readiness,
- sueño,
- recuperación de piernas,
- molestias activas,
- fútbol próximo.

### Sueño
La referencia individual está configurada en **05:00–13:00 con tolerancia ±1 h**.

Se pueden usar:
- duración,
- profundo / ligero / REM,
- despertares,
- siestas,
- Sleep Score,
- HRV,
- FC en reposo,
- consistencia contra el propio horario.

### FIT
Al subir un `.fit` se elige:
- Fútbol
- Running
- Fuerza / gimnasio

El archivo se guarda de forma privada y se procesa con la Edge Function `analyze-fit`.

### Fuerza
- registro manual de series;
- kg, reps, RIR y RPE;
- historial por ejercicio;
- comparación;
- importación de series desde FIT si el dispositivo las incluye.

### Test diario
Registra:
- energía,
- agujetas,
- estrés,
- ánimo,
- motivación,
- sensación de sueño,
- alcohol,
- cafeína tardía,
- carbohidratos,
- hidratación.

Se usa para construir correlaciones personales a largo plazo.

### Nutrición
- macros dinámicos según carga;
- proteína objetivo;
- carbohidratos diferentes para descanso / entreno / fútbol;
- meal planner;
- macros restantes;
- modo gasolina de partido;
- acceso a búsquedas de Cookidoo.

### Recuperación / molestias
- mapa corporal;
- rutina postpartido;
- preguntas de señales de alarma;
- modificación prudente del entrenamiento.

No es un sistema de diagnóstico médico.

### Informe semanal
Supabase genera automáticamente el informe los domingos después de la ventana habitual de sueño.

### Training Quest
Sistema ARPG personal:
- XP,
- niveles,
- Fuerza,
- Resistencia,
- Recuperación,
- logros,
- inventario,
- objetos con rareza,
- misiones pendientes.

Los objetos afectan únicamente a la capa de juego, no alteran decisiones médicas ni fisiológicas.

## Health Connect

Una web de GitHub Pages no puede leer Health Connect directamente. Por eso se incluye `android-companion/`.

El companion:
1. abre la misma web dentro de un WebView;
2. solicita permisos nativos de Health Connect;
3. lee sueño y entrenamientos recientes;
4. envía los datos al endpoint privado de Supabase;
5. devuelve el resultado a la web.

COROS incluye Health Connect entre sus integraciones compatibles para Android. Configura COROS para compartir allí los datos disponibles.

## Companion Android

Antes de compilar:

1. Publica la web.
2. Abre:
   `android-companion/app/src/main/res/values/strings.xml`
3. Sustituye:
   `https://TU_USUARIO.github.io/training-lab/`
   por la URL real.
4. En Supabase Auth añade:
   - la URL de GitHub Pages;
   - `traininglab://auth`.
5. Abre `android-companion` en Android Studio y compila.

El código fuente está preparado, pero el APK no se ha compilado en este entorno porque aquí no hay Android SDK/Gradle completo.

## Supabase

El backend ya está desplegado en un proyecto separado de Patxanguilles.

Consulta `supabase/README.md`.

## Seguridad

Nunca subir:
- `service_role`,
- secret keys,
- contraseña de base de datos,
- tokens privados.

La publishable key del frontend sí está diseñada para cliente web cuando RLS está correctamente configurado.

## Pruebas recomendadas

1. Publicar GitHub Pages.
2. Entrar con magic link.
3. Subir un FIT real de una pachanga.
4. Subir un FIT real de fuerza.
5. Registrar 2–3 noches manuales o sincronizarlas con Health Connect.
6. Completar varios check-ins.
7. Verificar que `Hoy` cambia al variar fatiga / pachanga / descanso.
8. Construir el companion y hacer la primera sincronización Health Connect.
