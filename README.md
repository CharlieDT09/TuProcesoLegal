# Tu Proceso Legal ⚖️🇵🇦

Plataforma de asistencia jurídica con inteligencia artificial para ciudadanos panameños. Orientación legal basada en los 17 códigos vigentes de la República de Panamá.

**Producción:** [tuprocesoia.com](https://tuprocesoia.com)

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vanilla JS + CSS (SPA, sin framework) |
| Backend | Vercel Serverless Functions (Node.js) |
| IA | Claude claude-sonnet-4-6 (Anthropic) |
| Embeddings | Voyage AI `voyage-law-2` (1024 dims) |
| Base de datos | Supabase PostgreSQL + pgvector (HNSW) |
| Auth | Supabase Auth (email/password) |
| Email | Resend — dominio `tuprocesoia.com` verificado |
| Dominio | Namecheap → Vercel |
| Deploy | Vercel (auto-deploy desde GitHub `main`) |

---

## Estructura del proyecto

```
TuProcesoLegal/
├── index.html              ← SPA completa (modales, sidebar, auth)
├── styles.css              ← Todo el diseño
├── app.js                  ← Lógica de chat, auth, JuriTools
├── quiz.js                 ← Quiz "Descubre tu Rama"
├── vercel.json             ← Config Vercel (headers, rewrites, durations)
├── package.json            ← Necesario para que Vercel reconozca funciones
├── api/
│   ├── chat.js             ← Chat con Claude + RAG
│   ├── search.js           ← Búsqueda semántica Biblioteca Jurídica
│   ├── escrito.js          ← Generador de escritos jurídicos (TuEscritoIA)
│   ├── ruta.js             ← Guía procesal paso a paso (Ruta Procesal)
│   └── welcome-email.js    ← Email de bienvenida al registrarse
└── database/
    ├── ingest_legal_codes.py   ← Script de ingesta de PDFs legales
    ├── schema.sql              ← Esquema Supabase (tablas + RPC)
    └── .env                    ← Variables locales para ingesta (no sube a Git)
```

---

## RAG — Base de conocimiento legal

- **17 códigos legales panameños** ingestados: 9,566 chunks en tabla `legal_documents`
- Pipeline: pregunta → Voyage AI embedding → pgvector cosine search → top-6 artículos → system prompt de Claude
- Script: `database/ingest_legal_codes.py` (Python 3.9+, pdfplumber + OCR fallback)
- Función RPC en Supabase: `match_legal_documents(query_embedding, match_threshold, match_count)`
- Umbral semántico: 0.48 (chat), 0.38 (Biblioteca)

---

## Funcionalidades

### Chat jurídico
- Respuestas de Claude con citas de artículos reales de la ley panameña
- Historial de mensajes en memoria (persistente al navegar entre landing y chat)
- Historial guardado en Supabase para usuarios registrados
- Rate limiting por usuario (servidor + cliente)

### Autenticación
- Registro e inicio de sesión con email/password (Supabase Auth)
- Recuperación de contraseña vía email
- Welcome email al registrarse (Resend desde `noreply@tuprocesoia.com`)
- "Continuar sin cuenta" disponible

### Mis Consultas
- Drawer con historial de conversaciones del usuario
- Clic para reanudar cualquier conversación con contexto completo
- Borrar conversaciones individuales (elimina de Supabase con animación)
- Nueva consulta desde el drawer

### JuriTools (sidebar flotante)

| Herramienta | Estado | Descripción |
|---|---|---|
| **Ruta Procesal** | ✅ Activo | Catálogo de 5 áreas + IA genera guía paso a paso personalizada |
| **TuEscritoIA** | ✅ Activo (requiere cuenta) | Genera escritos jurídicos profesionales — 6 categorías, descarga .doc |
| **Descubre tu Rama** | ✅ Activo | Quiz de 8 preguntas para identificar área legal ideal |
| **Biblioteca Jurídica** | ✅ Activo | Búsqueda semántica en los 17 códigos + browse por filtros |

---

## API Functions (`/api/`)

| Función | Descripción | Timeout |
|---|---|---|
| `chat.js` | Chat con Claude + RAG | 30s |
| `search.js` | Búsqueda semántica Biblioteca | 20s |
| `escrito.js` | Generador de escritos (requiere auth) | 30s |
| `ruta.js` | Guía procesal paso a paso | 30s |
| `welcome-email.js` | Email de bienvenida (Resend) | 10s |

---

## Variables de entorno (Vercel)

```
ANTHROPIC_API_KEY     — API de Claude (Anthropic)
VOYAGE_API_KEY        — Embeddings Voyage AI
SUPABASE_URL          — URL del proyecto Supabase
SUPABASE_ANON_KEY     — Clave pública Supabase
RESEND_API_KEY        — Envío de emails (Resend)
```

---

## Deploy

El proyecto usa **Vercel** con auto-deploy desde GitHub.

```bash
# Después de cada cambio:
git add <archivos>
git commit -m "descripción"
git push origin main
# Vercel despliega automáticamente en ~30 segundos
```

**Cache busting:** JS y CSS tienen `max-age=3600`. Al modificar `app.js`, `styles.css` o `quiz.js` incrementar `?v=N` en los `<script>` y `<link>` de `index.html`.

---

## Supabase — Tablas principales

| Tabla | Descripción |
|---|---|
| `legal_documents` | Chunks de los 17 códigos legales (vectores pgvector) |
| `conversations` | Conversaciones de usuarios registrados |
| `messages` | Mensajes individuales por conversación |

---

## © 2025 Tu Proceso Legal · tuprocesoia.com
