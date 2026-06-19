# Documentación — Tu Proceso Legal ⚖️🇵🇦

Bienvenido/a al equipo. Esta carpeta contiene **todo lo que necesitas saber para
trabajar en el proyecto sin romper producción**: cómo se manejan las versiones,
las ramas (branches) en GitHub y las reglas que todos debemos seguir.

> **Regla de oro:** nadie hace `push` directo a `main` ni a `staging`. Todo entra
> por Pull Request (PR) revisado.

---

## Índice

| Documento | Para qué sirve | Léelo si... |
|---|---|---|
| [01 — Flujo de trabajo Git](./01-flujo-de-trabajo-git.md) | Modelo de ramas (4 niveles antes de un release) y cómo viaja el código | Vas a programar cualquier cosa |
| [02 — Reglas y convenciones](./02-reglas-y-convenciones.md) | Nombres de ramas, commits, PRs y protección de ramas | Antes de tu primer commit |
| [03 — Guía rápida del equipo](./03-guia-rapida-equipo.md) | Comandos del día a día, paso a paso | Quieres el "cómo" práctico |
| [04 — Versionado y releases](./04-versionado-y-releases.md) | SemVer, tags, changelog y publicación | Vas a sacar una versión |
| [05 — Checklist de configuración inicial](./05-checklist-configuracion-inicial.md) | Tareas únicas del owner (proteger ramas, rotar llaves, etc.) | Eres admin del repo |

---

## Resumen en 30 segundos

1. El código siempre viaja por **4 ramas** antes de llegar a un release:

   ```
   feature/*  →  develop  →  staging  →  main (release con tag)
   ```

2. Trabajas en una rama corta (`feature/...`), abres un **PR a `develop`**.
3. Cuando varias features están integradas y probadas en `develop`, se suben a
   `staging` para **QA / preproducción**.
4. Lo aprobado en `staging` se publica a `main`, se etiqueta con una versión
   (`v1.2.0`) y Vercel lo despliega a **producción**.

Detalles completos en [01 — Flujo de trabajo Git](./01-flujo-de-trabajo-git.md).
