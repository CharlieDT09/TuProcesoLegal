# 03 — Guía rápida del equipo

El "cómo" práctico, con comandos copiables. Si solo vas a programar una tarea,
este documento es suficiente.

---

## 0. Una sola vez: clonar y preparar

```bash
git clone https://github.com/CharlieDT09/TuProcesoLegal.git
cd TuProcesoLegal

# Configura tu identidad (si no la tienes global)
git config user.name "Tu Nombre"
git config user.email "tu@email.com"

# Copia las variables de entorno locales (pide los valores al admin)
cp database/.env.example database/.env
```

---

## 1. Empezar una tarea nueva

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-tarea      # o fix/ , chore/ , docs/
```

---

## 2. Trabajar y guardar cambios

```bash
git add archivo1.js archivo2.css
git commit -m "feat(chat): agregar boton de exportar"
```

Antes de subir, revisa formato y lint localmente:

```bash
npm install          # solo la primera vez
npm run format       # arregla el formato automáticamente
npm run lint         # revisa errores de código
```

---

## 3. Subir y abrir el Pull Request

```bash
git push -u origin feature/mi-tarea
```

Luego en GitHub:
1. "Compare & pull request".
2. **Base = `develop`**, compare = tu rama.
3. Llena la plantilla (qué hiciste, cómo probarlo, screenshots).
4. Espera el **Preview de Vercel** y el **CI en verde**.
5. Pide review. Cuando aprueben → **"Squash and merge"** → borra la rama.

---

## 4. Mantener tu rama actualizada

Si `develop` avanzó mientras trabajabas:

```bash
git checkout develop
git pull origin develop
git checkout feature/mi-tarea
git merge develop          # resuelve conflictos si aparecen
```

---

## 5. Promover cambios (roles con permiso)

```bash
# Integración probada → QA
#   PR en GitHub: develop  →  staging

# QA aprobado → producción (ver doc 04 para el tag)
#   PR en GitHub: staging  →  main
```

---

## 6. Hotfix urgente en producción

```bash
git checkout main
git pull origin main
git checkout -b hotfix/descripcion
# ...arreglar...
git commit -m "fix(api): corregir error 500 en /api/chat"
git push -u origin hotfix/descripcion
# PR: hotfix/descripcion → main   (y después back-merge a develop)
```

---

## 7. Tabla de comandos útiles

| Quiero... | Comando |
|---|---|
| Ver en qué rama estoy | `git status` o `git branch` |
| Ver todas las ramas | `git branch -a` |
| Cambiar de rama | `git checkout nombre-rama` |
| Descartar cambios de un archivo | `git checkout -- archivo` |
| Ver historial corto | `git log --oneline -10` |
| Traer cambios del remoto | `git pull` |
| Borrar rama local ya mergeada | `git branch -d nombre-rama` |

---

## 8. Errores comunes a evitar

- ❌ Trabajar directo en `main`, `staging` o `develop`.
- ❌ Hacer `git push --force` a ramas compartidas.
- ❌ Commitear `.env` o llaves.
- ❌ PRs gigantes que mezclan 5 cosas distintas.
- ❌ Olvidar el `?v=N` al cambiar `app.js` / `styles.css` / `quiz.js`.

Siguiente: [04 — Versionado y releases](./04-versionado-y-releases.md)
