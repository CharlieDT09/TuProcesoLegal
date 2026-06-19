# 04 — Versionado y releases

Cómo numeramos, etiquetamos y publicamos cada versión de Tu Proceso Legal.

---

## 1. Versionado semántico (SemVer)

Formato: **`MAJOR.MINOR.PATCH`** → por ejemplo `1.3.2`

```
  1   .   3   .   2
  │       │       └── PATCH: correcciones de bugs, sin nuevas funciones
  │       └────────── MINOR: nuevas funciones compatibles hacia atrás
  └────────────────── MAJOR: cambios que rompen compatibilidad
```

Ejemplos:
- Arreglas un bug del chat → `1.3.2` → `1.3.3`
- Agregas "Exportar a PDF" → `1.3.3` → `1.4.0`
- Rediseñas la API y cambia el contrato → `1.4.0` → `2.0.0`

> El campo `version` de `package.json` debe coincidir con el último tag publicado.

---

## 2. Cómo se prepara un release (paso a paso)

1. Desde `develop` actualizado, crea la rama de release:
   ```bash
   git checkout develop && git pull
   git checkout -b release/1.4.0
   ```
2. En la rama `release/1.4.0`:
   - Sube la versión en `package.json` (`"version": "1.4.0"`).
   - Actualiza el `CHANGELOG.md` (ver sección 4).
   - Incrementa el `?v=N` en `index.html` si cambió JS/CSS.
3. PR **`release/1.4.0` → `staging`** y haz **QA completo**.
4. Si QA pasa: PR **`staging` → `main`**.
5. Una vez en `main`, **crea el tag** y el release:
   ```bash
   git checkout main && git pull
   git tag -a v1.4.0 -m "Exportar PDF + mejoras de chat"
   git push origin v1.4.0
   ```
6. En **GitHub → Releases → Draft a new release**, elige el tag `v1.4.0`,
   pega las notas del changelog y publica.
7. **Back-merge:** asegúrate de que `main` (con el bump) vuelva a `develop`.

---

## 3. Releases de hotfix

Para un parche urgente ya en producción:

```bash
# rama hotfix desde main, arreglar, PR a main
git tag -a v1.4.1 -m "Hotfix: error 500 en /api/chat"
git push origin v1.4.1
# luego back-merge del hotfix a develop y staging
```

---

## 4. CHANGELOG.md

Mantenemos un `CHANGELOG.md` en la raíz siguiendo el formato
[Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/):

```markdown
## [1.4.0] - 2026-06-19
### Added
- Exportar escritos a PDF desde TuEscritoIA.
### Fixed
- Historial duplicado al reanudar conversación.
### Changed
- Umbral de búsqueda de la Biblioteca ajustado a 0.40.
```

Categorías: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Deprecated`.

---

## 5. Tabla resumen de versiones

| Cambio | Sube | Ejemplo |
|---|---|---|
| Bug fix | PATCH | `1.4.0 → 1.4.1` |
| Nueva función compatible | MINOR | `1.4.1 → 1.5.0` |
| Cambio que rompe | MAJOR | `1.5.0 → 2.0.0` |

---

## 6. Reglas de oro del versionado

- **Nunca** reescribas un tag ya publicado. Si te equivocaste, saca un nuevo patch.
- Cada cosa que llega a `main` **debe** tener su tag y su entrada en el changelog.
- El número de `package.json`, el tag de git y el release de GitHub siempre coinciden.

Siguiente: [05 — Checklist de configuración inicial](./05-checklist-configuracion-inicial.md)
