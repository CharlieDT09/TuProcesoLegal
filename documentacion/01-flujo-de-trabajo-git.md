# 01 — Flujo de trabajo Git

Este documento explica **el modelo de ramas** que usamos en Tu Proceso Legal y
**por qué** lo usamos. Está pensado para que cualquier persona nueva entienda en
pocos minutos cómo aportar código sin riesgo.

---

## 1. ¿Por qué un modelo de ramas?

Antes el proyecto se trabajaba **directo sobre `main`**. Eso funciona con una
sola persona, pero con un equipo provoca:

- Conflictos constantes al editar los mismos archivos.
- Cero control de calidad antes de que el código llegue a producción.
- Imposibilidad de probar un conjunto de cambios en conjunto antes de publicarlos.

Por eso adoptamos un modelo con **4 ramas mínimas antes de un release**, inspirado
en *Git Flow* pero simplificado para nuestro deploy automático en Vercel.

---

## 2. Las 4 ramas (el código viaja en este orden)

```
   ┌───────────────┐     ┌───────────┐     ┌────────────┐     ┌────────────────────┐
   │  feature/xxx  │ ──► │  develop  │ ──► │  staging   │ ──► │  main (con tag vX) │
   │  (tu trabajo) │     │ (integra) │     │ (QA/preprd)│     │   (producción)     │
   └───────────────┘     └───────────┘     └────────────┘     └────────────────────┘
        Vercel:              Preview            Preview/QA          Producción
                                                                tuprocesoia.com
```

### 🌿 Ramas **permanentes** (nunca se borran)

| Rama | Rol | Quién puede mergear | Deploy en Vercel |
|---|---|---|---|
| `main` | **Producción.** Siempre estable y desplegable. Cada merge = un release etiquetado. | Solo vía PR desde `staging`, `release/*` o `hotfix/*` | Producción (`tuprocesoia.com`) |
| `staging` | **Preproducción / QA.** Espejo de lo que será el próximo release. Aquí se hacen las pruebas finales. | Solo vía PR desde `develop` o `release/*` | Preview (entorno de QA) |
| `develop` | **Integración.** Donde se juntan todas las features terminadas del equipo. | Solo vía PR desde ramas de trabajo | Preview (entorno de desarrollo) |

### 🍂 Ramas **temporales** (se crean y se borran al terminar)

| Prefijo | Para qué | Nace de | Se mergea a |
|---|---|---|---|
| `feature/*` | Nueva funcionalidad | `develop` | `develop` |
| `fix/*` | Corrección de un bug normal | `develop` | `develop` |
| `chore/*` | Configuración, mantenimiento, dependencias | `develop` | `develop` |
| `docs/*` | Solo documentación | `develop` | `develop` |
| `release/*` | Preparar una versión (bump de versión, changelog) | `develop` | `staging` y luego `main` |
| `hotfix/*` | **Bug urgente en producción** | `main` | `main` **y** `develop` |

---

## 3. El flujo normal, paso a paso

1. **Crea tu rama** desde `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/exportar-pdf
   ```
2. **Trabaja y commitea** siguiendo las
   [convenciones de commits](./02-reglas-y-convenciones.md).
3. **Sube tu rama** y abre un **PR hacia `develop`**:
   ```bash
   git push -u origin feature/exportar-pdf
   ```
   Vercel generará un **Preview Deploy** automático del PR para revisarlo.
4. **Revisión:** al menos 1 compañero aprueba y el CI pasa en verde.
5. **Merge a `develop`** (modo *Squash and merge*). Borra la rama.
6. Cuando `develop` tiene suficientes cambios listos, se abre un PR
   **`develop` → `staging`** para QA.
7. Probado en `staging`, se crea la versión: PR **`staging` → `main`**, se
   etiqueta (`vX.Y.Z`) y Vercel publica a producción. Ver
   [04 — Versionado y releases](./04-versionado-y-releases.md).

---

## 4. Hotfix: bug urgente en producción

Cuando hay un incendio en producción y no se puede esperar al ciclo normal:

```bash
git checkout main
git pull
git checkout -b hotfix/csp-supabase
# ...arreglar...
git push -u origin hotfix/csp-supabase
```

- PR de `hotfix/*` → **`main`** (release de parche, ej. `v1.2.1`).
- **Importante:** después hay que mergear el mismo hotfix también a `develop`
  (y `staging`) para que el arreglo no se pierda en el siguiente release.

---

## 5. Mapa con Vercel (deploy automático)

| Rama | Entorno Vercel | URL |
|---|---|---|
| `main` | **Production** | `tuprocesoia.com` |
| `staging` | Preview (entorno fijo "staging") | URL de preview estable |
| `develop` | Preview (entorno fijo "develop") | URL de preview estable |
| `feature/*` (PR) | Preview efímero por PR | URL única por PR |

> Configura los *Environments* y la rama de producción en
> **Vercel → Settings → Git**. La rama de producción debe ser `main`.

---

## 6. Diagrama del ciclo completo

```
 feature/login ─┐
 feature/pdf  ──┼──► develop ──► staging ──► release/1.3.0 ──► main ──► 🏷️ v1.3.0
 fix/historial ─┘                                                │
                                                                 └► (Vercel) producción

 hotfix/urgente ─────────────────────────────────────────────► main ──► 🏷️ v1.3.1
        └────────────────────────────────────────► develop (back-merge)
```

Siguiente: [02 — Reglas y convenciones](./02-reglas-y-convenciones.md)
