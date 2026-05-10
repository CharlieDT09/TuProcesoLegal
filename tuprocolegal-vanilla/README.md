# Tu Proceso Legal ⚖️🇵🇦

Asistente de orientación jurídica panameña — HTML + CSS + JS puro.

---

## Estructura
```
tu-proceso-legal/
├── index.html                  ← Interfaz completa
├── styles.css                  ← Todo el diseño
├── app.js                      ← Lógica del chat
├── netlify/
│   └── functions/
│       └── chat.js             ← Backend seguro (API key aquí)
└── netlify.toml                ← Config de Netlify
```

---

## Subir a Netlify

### 1. GitHub
```bash
git init
git add .
git commit -m "Tu Proceso Legal v1"
git remote add origin https://github.com/TU_USUARIO/tu-proceso-legal.git
git push -u origin main
```

### 2. Netlify
- netlify.com → Add new site → Import from Git
- Selecciona tu repositorio
- Build command: dejar vacío (no necesita compilación)
- Publish directory: `.`
- Deploy site

### 3. Variables de entorno en Netlify
Site configuration → Environment variables:
```
ANTHROPIC_API_KEY = sk-ant-XXXXXXX   ← cuando lo tengas
```

Sin API key el chatbot funciona en modo demo automáticamente.
Cuando agregues la key, se activa Claude en producción — sin tocar el código.

---

## © 2025 Tu Proceso Legal
