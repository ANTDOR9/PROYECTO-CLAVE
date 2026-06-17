# PROYECTO-CLAVEapp

App de estudio tipo trivia para repasar exámenes de SENATI. Pegas tus preguntas
en un formato simple y se convierten en un juego, organizadas por **semestre →
curso → evaluación → pregunta**. Funciona offline, sin servidor y sin cuentas.

## Estructura

```
PROYECTO-CLAVE/
├── www/                 # la app web (esto empaqueta Capacitor)
│   ├── index.html       # pantallas
│   ├── css/styles.css   # estilos
│   ├── js/app.js        # lógica del quiz
│   └── assets/          # imágenes y recursos
├── .gitignore
├── package.json
└── README.md
            # capacitor.config.json y android/ aparecen al configurar Capacitor
```

## Probar en el navegador (durante el desarrollo)

Abre `www/index.html` directamente en el navegador, o levanta un servidor local:

```bash
npm run serve      # usa "npx serve www"
```

> Las fuentes (Fraunces, Inter, JetBrains Mono) se cargan desde Google Fonts.
> Sin internet, la app igual funciona con fuentes del sistema. Para que se vean
> idénticas offline en el APK, más adelante se pueden descargar y servir localmente.

## Empaquetar a APK (Fase 2, con Capacitor)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "PROYECTO-CLAVEapp" "com.tuusuario.claveapp" --web-dir=www
npm install @capacitor/android
npx cap add android
npx cap sync
npx cap open android   # genera el APK desde Android Studio
```

Plugins útiles: `@capacitor/filesystem` (backup), `@capacitor/camera` o un input
de archivo (imágenes).

## Estado actual

- [x] Motor de quiz (pegar preguntas, modo estudio/examen, resultados, repaso de falladas)
- [ ] Pantalla de cursos (crear/borrar, color, % dominado)
- [ ] Evaluaciones dentro de un curso (caja de pegado por evaluación)
- [ ] Almacenamiento persistente en IndexedDB
- [ ] Multi-respuesta e imágenes por pregunta
- [ ] Combinar evaluaciones → simulacro final
- [ ] Exportar / importar backup (JSON)

## Formato de preguntas

```
1. ¿Pregunta?
a) Alternativa
b) Correcta *          ← la correcta lleva * al final (varias * si hay varias)
c) Alternativa
d) Alternativa
> Explicación opcional

(separa cada pregunta con una línea en blanco)
```