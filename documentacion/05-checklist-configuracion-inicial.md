# 05 — Checklist de configuración inicial (para el owner/admin)

Estas son **tareas únicas** que debe hacer quien administra el repositorio y las
cuentas (GitHub, Vercel, proveedores de API). No se pueden hacer desde el código:
requieren tu sesión y permisos. Hazlas **antes** de invitar al equipo.

---

## 1. 🔴 Seguridad: verificar que no haya secretos en Git

El archivo `database/.env` existe en disco y está protegido por `.gitignore`,
pero **pudo haberse subido antes** de que existiera esa protección. Verifica:

```bash
git ls-files | findstr /i env      # Windows PowerShell/CMD
# o en bash:
git ls-files | grep -i env
```

- Si **solo** aparece `database/.env.example` → todo bien. ✅
- Si aparece `database/.env` (u otro `.env`) → está rastreado. Sácalo:
  ```bash
  git rm --cached database/.env
  git commit -m "chore: dejar de rastrear database/.env"
  git push
  ```
- Si estuvo rastreado en algún momento, **rota TODAS las llaves** por seguridad:
  - `ANTHROPIC_API_KEY` (console.anthropic.com)
  - `VOYAGE_API_KEY` (voyage.ai)
  - `SUPABASE_SERVICE_KEY` y `SUPABASE_ANON_KEY` (Supabase → Settings → API)
  - `RESEND_API_KEY` (resend.com)

> Si la llave llegó a estar en el historial, considera además limpiar el
> historial con `git filter-repo` o BFG (operación delicada, coordina con el equipo).

---

## 2. 🧹 Limpiar la estructura del proyecto

Hay carpetas duplicadas/residuales que confunden al equipo:

- Worktrees de Claude dentro de `.claude/worktrees/...` (ya ignorados por
  `.gitignore`, pero pueden eliminarse del disco si no se usan).
- Verifica que el código vivo sea **una sola** carpeta de proyecto y que no haya
  copias sueltas de `app.js`, `index.html`, etc. fuera de ella.

> No borres nada sin confirmar que no es el árbol de trabajo activo.

---

## 3. 🌿 Crear las ramas permanentes

Por defecto solo existe `main`. Crea `develop` y `staging` a partir de ella:

```bash
git checkout main
git pull

git checkout -b develop
git push -u origin develop

git checkout main
git checkout -b staging
git push -u origin staging
```

Opcional: en **GitHub → Settings → General → Default branch**, cambia la rama por
defecto a **`develop`** (así los PRs apuntan ahí por defecto).

---

## 4. 🔒 Proteger las ramas

En **GitHub → Settings → Branches → Add branch ruleset / rule**, aplica a
`main`, `staging` y `develop` (detalle en
[02 — Reglas y convenciones](./02-reglas-y-convenciones.md#4-protección-de-ramas-configura-el-admin)):

- Require pull request + approvals (1, o 2 para `main`).
- Require status checks → seleccionar **CI**.
- Require branches up to date + conversation resolution.
- Block force pushes y deletions.

---

## 5. ⚙️ Configurar Vercel por entorno

En **Vercel → Settings → Git**:
- Production Branch = `main`.
- Activa Preview Deployments para PRs.

En **Vercel → Settings → Environment Variables**, carga por entorno
(Production y Preview): `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `RESEND_API_KEY`.

---

## 6. 👥 Configurar revisores (CODEOWNERS)

Edita `.github/CODEOWNERS` y reemplaza el placeholder por los usuarios reales del
equipo, para que se asignen revisores automáticamente en cada PR.

---

## 7. ✅ Verificar el CI

Tras el primer PR, confirma que el workflow `.github/workflows/ci.yml` corre y
aparece como check requerido en la protección de ramas.

---

## 8. (Opcional) Activar plantillas

Las plantillas de PR e issues ya están en `.github/`. GitHub las usa
automáticamente al abrir un PR o un issue nuevo.

---

## Resumen de qué ya quedó hecho en el código vs. qué te toca a ti

| Hecho en el repo (este commit) | Te toca a ti (cuenta/admin) |
|---|---|
| `.gitignore` reforzado | Verificar/sacar `.env` rastreado y rotar llaves |
| ESLint + Prettier + EditorConfig | Crear ramas `develop` y `staging` |
| CI de GitHub Actions | Proteger ramas en GitHub |
| Plantillas PR/issues + CODEOWNERS | Poner usuarios reales en CODEOWNERS |
| `CONTRIBUTING.md` + esta documentación | Configurar entornos y env vars en Vercel |
| `CHANGELOG.md` inicial | Limpiar carpetas duplicadas del disco |
