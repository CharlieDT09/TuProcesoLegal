# Changelog

Todas las versiones notables de Tu Proceso Legal se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y versionado según [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Carpeta `documentacion/` con el plan de manejo de versiones y branches en GitHub.
- Flujo de trabajo de 4 ramas: `feature/* → develop → staging → main`.
- Tooling de calidad: ESLint, Prettier y EditorConfig.
- CI con GitHub Actions (lint + verificación de formato).
- Gobernanza del repo: `CONTRIBUTING.md`, plantillas de PR e issues, `CODEOWNERS`.
- `CHANGELOG.md`.

### Changed
- `.gitignore` reforzado (todos los `.env`, `.vercel/`, archivos de OS y editores).
- `package.json` con scripts `lint`, `format` y dependencias de desarrollo.

## [1.0.0] - 2025
### Added
- Versión inicial en producción: chat jurídico con RAG, Biblioteca Jurídica,
  TuEscritoIA, Ruta Procesal, Quiz "Descubre tu Rama" y autenticación.
