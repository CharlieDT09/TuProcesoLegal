# Cómo contribuir a Tu Proceso Legal

Gracias por sumarte. Esta guía es el resumen rápido; la documentación completa
está en la carpeta [`documentacion/`](./documentacion/README.md).

## Resumen del flujo

1. Crea tu rama desde `develop`: `feature/...`, `fix/...`, `chore/...`, `docs/...`.
2. Programa y commitea con [Conventional Commits](./documentacion/02-reglas-y-convenciones.md#2-mensajes-de-commit--conventional-commits).
3. Antes de subir: `npm run format` y `npm run lint`.
4. Abre un Pull Request **hacia `develop`** y llena la plantilla.
5. Espera el Preview de Vercel y el CI en verde, consigue 1 aprobación.
6. **Squash and merge** y borra tu rama.

El código viaja: `feature/* → develop → staging → main (release con tag)`.
Detalle en [01 — Flujo de trabajo Git](./documentacion/01-flujo-de-trabajo-git.md).

## Reglas que no se rompen

- Nada de `push` directo a `main`, `staging` o `develop`.
- Nada de `.env`, llaves ni secretos en el repo.
- Al tocar `app.js` / `styles.css` / `quiz.js`, sube el `?v=N` en `index.html`.

## Comandos útiles

```bash
npm install         # instala dependencias de desarrollo
npm run format      # formatea el código con Prettier
npm run format:check# verifica formato sin modificar (lo que corre el CI)
npm run lint        # revisa el código con ESLint
```

Dudas → revisa [`documentacion/`](./documentacion/README.md) o pregunta al equipo.
