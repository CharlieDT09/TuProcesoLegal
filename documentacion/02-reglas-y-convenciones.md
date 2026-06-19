# 02 — Reglas y convenciones

Reglas **obligatorias** para todo el equipo. Si todos las seguimos, el repo se
mantiene limpio, los releases son predecibles y nadie rompe producción.

---

## 1. Nombres de ramas

Formato: `tipo/descripcion-corta-en-kebab-case`

| Tipo | Ejemplo |
|---|---|
| `feature/` | `feature/exportar-pdf-escritos` |
| `fix/` | `fix/historial-duplicado` |
| `hotfix/` | `hotfix/csp-supabase` |
| `chore/` | `chore/configurar-eslint` |
| `docs/` | `docs/actualizar-readme` |
| `release/` | `release/1.3.0` |

**Reglas:**
- Todo en minúsculas, palabras separadas por guiones (`-`).
- Sin tildes, ñ ni espacios.
- Corta y descriptiva. Opcional incluir el número de issue: `feature/42-exportar-pdf`.
- Una rama = una tarea. No acumules cosas no relacionadas.

---

## 2. Mensajes de commit → Conventional Commits

Formato: `tipo(alcance): descripción en presente`

```
feat(chat): agregar historial persistente por usuario
fix(api): corregir rate limit para usuarios anónimos
docs(readme): actualizar stack y variables de entorno
```

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de un bug |
| `docs` | Solo documentación |
| `style` | Formato (espacios, comas) sin cambiar lógica |
| `refactor` | Reorganizar código sin cambiar comportamiento |
| `perf` | Mejora de rendimiento |
| `test` | Agregar o ajustar pruebas |
| `chore` | Configuración, dependencias, tareas varias |

**Reglas:**
- La descripción va en **minúscula, en presente** y sin punto final.
- Máximo ~72 caracteres en la primera línea.
- Si el cambio rompe compatibilidad, agrega `!`: `feat(api)!: cambiar formato de respuesta`.
- El `(alcance)` es opcional pero recomendado (`chat`, `api`, `auth`, `quiz`, `db`, `ui`...).

---

## 3. Reglas de Pull Request (PR)

1. **Todo entra por PR.** Prohibido `push` directo a `main`, `staging` y `develop`.
2. Apunta tu PR a la rama correcta:
   - `feature/*`, `fix/*`, `chore/*`, `docs/*` → **`develop`**
   - integración probada → PR `develop` → **`staging`**
   - release listo → PR `staging` → **`main`**
3. **Mínimo 1 aprobación** de otro miembro antes de mergear.
4. **El CI debe estar en verde** (lint + formato).
5. Resuelve todos los comentarios antes de mergear.
6. Usa **"Squash and merge"** para que cada PR sea **un commit limpio** en la
   rama destino (esto evita el ruido de commits de merge).
7. **Borra la rama** después del merge.
8. Llena la plantilla del PR (descripción, cómo probar, screenshots).
9. PRs pequeños y enfocados. Si supera ~400 líneas de cambio, considera dividirlo.

---

## 4. Protección de ramas (configura el admin)

En **GitHub → Settings → Branches → Add rule**, para `main`, `staging` y `develop`:

- [x] Require a pull request before merging
- [x] Require approvals → **1** (o 2 para `main`)
- [x] Require status checks to pass before merging → seleccionar el check **CI**
- [x] Require branches to be up to date before merging
- [x] Require conversation resolution before merging
- [x] Do not allow bypassing the above settings
- [x] Block force pushes
- [x] Do not allow deletions

> Para `main` recomendamos 2 aprobaciones y, si es posible, *Require linear history*.

---

## 5. Manejo de secretos (¡crítico!)

- **NUNCA** se commitea un archivo `.env`, llaves o tokens. Ya están en
  `.gitignore` (`.env`, `database/.env`, etc.).
- Las variables de producción viven en **Vercel → Settings → Environment Variables**,
  separadas por entorno (Production / Preview).
- Para desarrollo local usa `database/.env` (copiado de `database/.env.example`).
- Si alguna vez se filtra una llave: **rótala de inmediato** en el proveedor
  (Anthropic, Voyage, Supabase, Resend) y avisa al equipo.

---

## 6. Recordatorios específicos del proyecto

- **Cache busting:** al modificar `app.js`, `styles.css` o `quiz.js`, incrementa
  el `?v=N` en los `<script>` y `<link>` de `index.html` (hoy va en `v=10`).
- Si tocas la **CSP** en `vercel.json`, verifica que no rompas el frontend.
- Los cambios de **base de datos** (`database/*.sql`) se documentan en el PR y se
  aplican en Supabase de forma coordinada.

Siguiente: [03 — Guía rápida del equipo](./03-guia-rapida-equipo.md)
