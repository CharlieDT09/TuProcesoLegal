#!/usr/bin/env python3
"""
ingest_legal_codes.py
=====================
Extrae texto de los PDFs legales panameños, los divide por artículo,
genera embeddings con Voyage AI voyage-law-2 y los sube a
Supabase (tabla legal_documents con pgvector).

Voyage AI es el proveedor oficial de embeddings de Anthropic.
voyage-law-2 esta entrenado especificamente en documentos legales.
200M tokens gratis, sin tarjeta de credito.

═══════════════════════════════════════════════════════════════════
INSTALACIÓN DE POPPLER (requerido para OCR de PDFs escaneados)
═══════════════════════════════════════════════════════════════════

Windows:
  1. Descarga el ZIP desde:
     https://github.com/oschwartz10612/poppler-windows/releases/latest
  2. Extrae en C:\\poppler
  3. Agrega C:\\poppler\\Library\\bin al PATH del sistema:
     Panel de Control → Variables de entorno → PATH → Nueva entrada
  4. Verifica: pdftoppm -v  (debe mostrar versión)

  Alternativa rápida con Chocolatey:
     choco install poppler

  Alternativa con Conda:
     conda install -c conda-forge poppler

macOS:
  brew install poppler

Linux:
  sudo apt install poppler-utils   # Ubuntu/Debian
  sudo dnf install poppler-utils   # Fedora

═══════════════════════════════════════════════════════════════════
INSTALACIÓN DE DEPENDENCIAS PYTHON
═══════════════════════════════════════════════════════════════════

  pip install -r requirements_rag.txt

  (incluye: pdfplumber, pdf2image, pytesseract, voyageai, supabase, tqdm)

  Para OCR también necesitas Tesseract:
  Windows: https://github.com/UB-Mannheim/tesseract/wiki
           Instalar con idioma Español activado
  macOS:   brew install tesseract tesseract-lang
  Linux:   sudo apt install tesseract-ocr tesseract-ocr-spa

═══════════════════════════════════════════════════════════════════
VARIABLES DE ENTORNO  (database/.env)
═══════════════════════════════════════════════════════════════════

    SUPABASE_URL          — URL de tu proyecto Supabase
    SUPABASE_SERVICE_KEY  — Service Role Key (Settings → API)
    VOYAGE_API_KEY        — API key de Voyage AI (voyageai.com)

USO:
    cd database
    python ingest_legal_codes.py              # procesar todos los PDFs
    python ingest_legal_codes.py --dry-run    # contar chunks sin subir
    python ingest_legal_codes.py --file "codigo-de-trabajo.pdf"
    python ingest_legal_codes.py --no-ocr     # solo pdfplumber, sin OCR
"""

from __future__ import annotations  # compatibilidad Python 3.9+

import os
import re
import sys
import time
import argparse
from pathlib import Path

# ── Dependencias obligatorias ────────────────────────────────────
try:
    import pdfplumber
except ImportError:
    sys.exit("❌  Falta pdfplumber. Ejecuta: pip install -r requirements_rag.txt")

try:
    import voyageai
except ImportError:
    sys.exit("❌  Falta voyageai. Ejecuta: pip install -r requirements_rag.txt")

try:
    from supabase import create_client
except ImportError:
    sys.exit("❌  Falta supabase. Ejecuta: pip install -r requirements_rag.txt")

# ── Dependencias opcionales (OCR con Poppler) ────────────────────
try:
    from pdf2image import convert_from_path
    from pdf2image.exceptions import (
        PDFInfoNotInstalledError,
        PDFPageCountError,
        PDFSyntaxError,
    )
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # .env es opcional

try:
    from tqdm import tqdm
except ImportError:
    tqdm = None


# ════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ════════════════════════════════════════════════════════════════

SUPABASE_URL  = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")
VOYAGE_KEY    = os.environ.get("VOYAGE_API_KEY", "")

# Carpeta con los PDFs (ajusta si es necesario)
PDF_DIR = Path(r"C:\Users\PC\Downloads\codigos\codigos")

# ── Configuración Poppler ────────────────────────────────────────
# Si poppler no está en el PATH, apunta aquí a su carpeta bin.
# Ejemplo Windows: r"C:\poppler\Library\bin"
# Dejar en None si ya está en el PATH del sistema.
POPPLER_PATH: str | None = os.environ.get("POPPLER_PATH") or None

# Mínimo de caracteres extraídos por pdfplumber para considerar la página
# como texto-nativo (por debajo → se intenta OCR con Poppler + Tesseract)
MIN_TEXT_CHARS_PER_PAGE = 80

# Idioma de Tesseract para el OCR (español panameño)
TESSERACT_LANG = "spa"

EMBED_MODEL     = "voyage-law-2"  # 1024 dims — entrenado en documentos legales
EMBED_DIMS      = 1024
MAX_CHUNK_CHARS = 2500   # máximo caracteres por chunk de artículo
BATCH_SIZE      = 50     # artículos por batch de Voyage AI + inserción Supabase
RATE_LIMIT_WAIT = 0.25   # segundos entre batches (evitar rate limit)

# ── Mapeo nombre de archivo → nombre legible del código ──────────
CODE_NAMES: dict[str, str] = {
    "90301":                    "Código Judicial",
    "acuerdo-560-a-de-2019":    "Acuerdo 560-A de 2019 (Arancel Judicial)",
    "b3wq53i9ad-ley-46-de-17-de-julio-de-2013---general-de-adopciones-de-la-republica-de-panamÁ":
                                "Ley 46 de 2013 — Adopciones de Panamá",
    "codigo_civil":             "Código Civil de Panamá",
    "codigo-agrario":           "Código Agrario de Panamá",
    "codigo-comercio-republica-panama":
                                "Código de Comercio de Panamá",
    "codigo-de-etica-y-responsabilidad-profesional-del-abogado":
                                "Código de Ética del Abogado",
    "Código-de-la-Familia1":    "Código de la Familia",
    "código-detrabajo":         "Código de Trabajo",
    "codigo-fiscal2":           "Código Fiscal",
    "codigo-penal-2016":        "Código Penal",
    "CODIGO-PROCESAL-PENAL-Comentado-COMPLETO-20-AGO-2018":
                                "Código Procesal Penal",
    "constitucion-politica-con-indice-analitico":
                                "Constitución Política de Panamá",
    "Gaceta oficial 2025-2026": "Gaceta Oficial 2025-2026",
    "ley-402-de-2023-que-adopta-el-codigo-procesal-civil-de-la-republica-de-panama":
                                "Código Procesal Civil (Ley 402 de 2023)",
    "ley-492-de-2025-que-modifica-el-codigo-civil-para-eliminar-terminos-peyorativos":
                                "Ley 492 de 2025 — Reforma Código Civil",
    "mesicic2_pan_anexo_3_sp":  "Convención Interamericana contra la Corrupción",
}


# ════════════════════════════════════════════════════════════════
# EXTRACCIÓN DE TEXTO — 3 estrategias en cascada
#
#  1. pdfplumber  → rápido, exacto para PDFs con texto nativo
#  2. Poppler pdftotext (via pdf2image) → mejor para PDFs complejos
#  3. Poppler + Tesseract OCR → fallback para PDFs escaneados
# ════════════════════════════════════════════════════════════════

def _check_poppler() -> bool:
    """Verifica que Poppler esté disponible y funcionando."""
    if not PDF2IMAGE_AVAILABLE:
        return False
    import subprocess
    try:
        cmd = ["pdftoppm", "-v"]
        if POPPLER_PATH:
            cmd[0] = str(Path(POPPLER_PATH) / "pdftoppm")
        subprocess.run(cmd, capture_output=True, timeout=5)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def extract_text_pdfplumber(pdf_path: Path) -> tuple[str, int]:
    """
    Extrae texto con pdfplumber.
    Retorna (texto, páginas_con_poco_texto).
    """
    parts: list[str] = []
    weak_pages = 0
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                parts.append(t)
                if len(t.strip()) < MIN_TEXT_CHARS_PER_PAGE:
                    weak_pages += 1
    except Exception as e:
        print(f"    ⚠  pdfplumber: {e}")
    return "\n".join(parts), weak_pages


def extract_text_poppler_ocr(pdf_path: Path) -> str:
    """
    Convierte cada página a imagen con Poppler (pdf2image) y aplica
    OCR con Tesseract. Usado para PDFs escaneados o con texto corrupto.
    """
    if not PDF2IMAGE_AVAILABLE:
        return ""
    if not TESSERACT_AVAILABLE:
        print("    ⚠  pytesseract no instalado — OCR no disponible")
        return ""

    parts: list[str] = []
    try:
        kwargs: dict = {"dpi": 300, "fmt": "png", "thread_count": 2}
        if POPPLER_PATH:
            kwargs["poppler_path"] = POPPLER_PATH

        images = convert_from_path(str(pdf_path), **kwargs)
        for img in images:
            text = pytesseract.image_to_string(img, lang=TESSERACT_LANG)
            if text.strip():
                parts.append(text)
    except PDFInfoNotInstalledError:
        print("    ❌  Poppler no está en el PATH. Instálalo según las instrucciones del script.")
    except Exception as e:
        print(f"    ⚠  OCR Poppler+Tesseract: {e}")

    return "\n".join(parts)


def extract_text(pdf_path: Path, use_ocr: bool = True) -> str:
    """
    Estrategia en cascada:
      1. pdfplumber  — texto nativo
      2. Si muchas páginas tienen poco texto → OCR con Poppler + Tesseract
    """
    text, weak_pages = extract_text_pdfplumber(pdf_path)
    total_pages = max(1, text.count("\n") // 10 + 1)  # estimado

    # Si más del 40% de las páginas tienen poco texto → intentar OCR
    needs_ocr = use_ocr and (weak_pages / total_pages) > 0.40

    if needs_ocr:
        print(f"    🔍  {weak_pages} páginas con poco texto → activando OCR (Poppler + Tesseract)")
        ocr_text = extract_text_poppler_ocr(pdf_path)
        if len(ocr_text.strip()) > len(text.strip()):
            print("    ✅  OCR produjo más texto — usando resultado OCR")
            return ocr_text
        print("    ↩  OCR no mejoró resultado — usando pdfplumber")

    return text


# ════════════════════════════════════════════════════════════════
# CHUNKING POR ARTÍCULO
# ════════════════════════════════════════════════════════════════

# Captura: "Artículo 123", "ARTÍCULO 1-A", "Art. 45"
ARTICLE_RE = re.compile(
    r'(?m)^[ \t]*(?:Art[íi]culo|ARTÍCULO|Art\.)\s+(\d+[\w\-]*\.?)\b',
    re.IGNORECASE,
)

# Captura encabezados de sección: LIBRO I, TÍTULO III, CAPÍTULO 2
SECTION_RE = re.compile(
    r'(?m)^[ \t]*'
    r'((?:LIBRO|TÍTULO|TITULO|CAPÍTULO|CAPITULO|Capítulo|Título|Libro)\s+'
    r'(?:[IVXLCDM]+|\d+)\b[^\n]{0,80})',
)


def chunk_by_article(text: str, codigo_name: str, source_file: str) -> list[dict]:
    """
    Divide el texto en chunks semánticos por artículo legal.
    Incluye el contexto de sección (Libro/Título/Capítulo) como metadata.
    Si no hay artículos detectados, cae a chunking por párrafo.
    """
    articles = list(ARTICLE_RE.finditer(text))
    sections = list(SECTION_RE.finditer(text))
    chunks: list[dict] = []

    def get_section(pos: int) -> str:
        """Retorna la sección más reciente antes de la posición dada."""
        for sec in reversed(sections):
            if sec.start() < pos:
                return sec.group(1).strip()
        return ""

    if not articles:
        # Fallback: dividir por párrafos dobles
        paras = [p.strip() for p in re.split(r'\n{2,}', text) if len(p.strip()) > 80]
        for i, para in enumerate(paras):
            chunks.append(_make_chunk(
                codigo_name, source_file,
                section=get_section(0),
                article_num=f"Párrafo {i + 1}",
                content=para[:MAX_CHUNK_CHARS],
            ))
        return chunks

    for i, match in enumerate(articles):
        art_num = f"Artículo {match.group(1)}"
        start   = match.start()
        end     = articles[i + 1].start() if i + 1 < len(articles) else len(text)
        content = text[start:end].strip()
        section = get_section(start)

        if len(content) <= MAX_CHUNK_CHARS:
            chunks.append(_make_chunk(codigo_name, source_file, section, art_num, content))
        else:
            # Artículo muy largo → dividir preservando contexto
            sub_parts = _split_long(content, MAX_CHUNK_CHARS)
            for j, part in enumerate(sub_parts):
                chunks.append(_make_chunk(
                    codigo_name, source_file, section,
                    f"{art_num} (parte {j + 1}/{len(sub_parts)})", part,
                ))

    return chunks


def _make_chunk(codigo_name, source_file, section, article_num, content) -> dict:
    return {
        "source_file": source_file,
        "codigo_name": codigo_name,
        "section":     section,
        "article_num": article_num,
        "content":     content,
    }


def _split_long(text: str, max_chars: int) -> list[str]:
    """Divide texto largo por párrafos sin superar max_chars."""
    paras   = re.split(r'\n{2,}', text)
    chunks  : list[str] = []
    current = ""

    for para in paras:
        candidate = (current + "\n\n" + para).strip() if current else para
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            # Si un solo párrafo es mayor que el límite, cortarlo por fuerza
            current = para[:max_chars] if len(para) > max_chars else para

    if current:
        chunks.append(current)

    return chunks or [text[:max_chars]]


# ════════════════════════════════════════════════════════════════
# EMBEDDINGS (Voyage AI — voyage-law-2)
# Modelo especializado en documentos legales, partner oficial de Anthropic
# ════════════════════════════════════════════════════════════════

def get_embeddings(texts: list[str], client: voyageai.Client) -> list[list[float]]:
    """Genera embeddings legales con Voyage AI voyage-law-2."""
    cleaned = [t.replace("\n", " ").strip()[:16000] for t in texts]  # 16k token ctx
    result  = client.embed(cleaned, model=EMBED_MODEL, input_type="document")
    return result.embeddings


# ════════════════════════════════════════════════════════════════
# UPLOAD A SUPABASE
# ════════════════════════════════════════════════════════════════

def upload_batch(chunks: list[dict], embeddings: list[list[float]], sb) -> None:
    rows = [
        {**chunk, "embedding": emb}
        for chunk, emb in zip(chunks, embeddings)
    ]
    sb.table("legal_documents").insert(rows).execute()


# ════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════

def iter_with_progress(iterable, desc=""):
    if tqdm:
        return tqdm(iterable, desc=desc, unit="pdf")
    return iterable


def main():
    parser = argparse.ArgumentParser(description="Ingesta de PDFs legales → Supabase pgvector")
    parser.add_argument("--file",    help="Procesar solo este archivo PDF (nombre exacto)")
    parser.add_argument("--dry-run", action="store_true", help="Extraer y contar chunks sin subir")
    parser.add_argument("--no-ocr",  action="store_true", help="Desactivar OCR (solo pdfplumber)")
    args = parser.parse_args()
    use_ocr = not args.no_ocr

    print("⚖️  Tu Proceso Legal — Ingesta RAG con pgvector\n")

    # ── Estado de Poppler / OCR ───────────────────────────────────
    poppler_ok    = _check_poppler()
    tesseract_ok  = TESSERACT_AVAILABLE
    ocr_ready     = use_ocr and poppler_ok and tesseract_ok

    print("── Motores de extracción ──────────────────────────")
    print(f"  pdfplumber  : ✅ activo (texto nativo)")
    print(f"  Poppler     : {'✅ detectado' if poppler_ok else '⚠  no encontrado — instalar para OCR'}")
    print(f"  Tesseract   : {'✅ detectado' if tesseract_ok else '⚠  no encontrado — instalar para OCR'}")
    print(f"  OCR activo  : {'✅ sí (PDFs escaneados serán procesados)' if ocr_ready else '❌ no — solo texto nativo'}")
    if POPPLER_PATH:
        print(f"  Poppler path: {POPPLER_PATH}")
    print()

    if use_ocr and not ocr_ready:
        print("  💡 Para activar OCR consulta las instrucciones al inicio del script.\n")

    # Validar configuración
    missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "VOYAGE_API_KEY")
               if not os.environ.get(v)]
    if missing and not args.dry_run:
        print("❌  Faltan variables de entorno:")
        for v in missing:
            print(f"   • {v}")
        print("\nCrea el archivo database/.env con esas variables y vuelve a ejecutar.")
        sys.exit(1)

    if not PDF_DIR.exists():
        print(f"❌  No existe la carpeta de PDFs: {PDF_DIR}")
        sys.exit(1)

    pdf_files = sorted(PDF_DIR.glob("*.pdf"))
    if args.file:
        pdf_files = [f for f in pdf_files if f.name == args.file]
        if not pdf_files:
            print(f"❌  No se encontró el archivo: {args.file}")
            sys.exit(1)

    if not pdf_files:
        print(f"❌  No se encontraron PDFs en: {PDF_DIR}")
        sys.exit(1)

    print(f"📂  PDFs encontrados: {len(pdf_files)}\n")

    if not args.dry_run:
        voyage_client = voyageai.Client(api_key=VOYAGE_KEY)
        sb            = create_client(SUPABASE_URL, SUPABASE_KEY)

        print("🗑   Limpiando tabla legal_documents...")
        sb.table("legal_documents").delete().gte("id", 0).execute()
        print()

    total_chunks    = 0
    total_chars_est = 0
    errors          = []

    for pdf_path in iter_with_progress(pdf_files, desc="PDFs"):
        stem        = pdf_path.stem
        codigo_name = CODE_NAMES.get(stem, stem.replace("-", " ").replace("_", " ").title())

        label = f"📄  {codigo_name}"
        if not tqdm:
            print(label)

        # 1. Extraer texto (pdfplumber + OCR si está disponible)
        text = extract_text(pdf_path, use_ocr=ocr_ready)
        if not text.strip():
            msg = f"  ⚠  Sin texto extraído (¿PDF escaneado?): {pdf_path.name}"
            print(msg)
            errors.append(msg)
            continue

        # 2. Chunking por artículo
        chunks = chunk_by_article(text, codigo_name, pdf_path.name)
        if not tqdm:
            print(f"    ✂   {len(chunks)} chunks")

        if args.dry_run:
            total_chunks    += len(chunks)
            total_chars_est += sum(len(c["content"]) for c in chunks)
            continue

        # 3. Embeddings + upload en batches
        pdf_ok = True
        for i in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[i:i + BATCH_SIZE]
            texts = [c["content"] for c in batch]

            try:
                embeddings = get_embeddings(texts, voyage_client)
                upload_batch(batch, embeddings, sb)
                total_chars_est += sum(len(t) for t in texts)
                time.sleep(RATE_LIMIT_WAIT)

            except Exception as e:
                msg = f"  ❌  Batch {i // BATCH_SIZE + 1} de {pdf_path.name}: {e}"
                print(msg)
                errors.append(msg)
                pdf_ok = False
                time.sleep(2)

        if not tqdm:
            status = "✅" if pdf_ok else "⚠ (con errores)"
            print(f"    {status}  Subido\n")

        total_chunks += len(chunks)

    # ── Resumen ──────────────────────────────────────────────────
    tokens_est = total_chars_est // 4
    cost_usd   = 0.0  # voyage-law-2 es gratis hasta 200M tokens

    print("\n" + "═" * 50)
    print(f"{'DRY RUN — ' if args.dry_run else ''}INGESTA COMPLETADA")
    print("═" * 50)
    print(f"  Chunks totales   : {total_chunks:,}")
    print(f"  Tokens estimados : {tokens_est:,}")
    print(f"  Costo estimado   : ${cost_usd:.4f} USD")

    if errors:
        print(f"\n⚠  {len(errors)} error(es):")
        for err in errors:
            print(f"  {err}")

    if not args.dry_run:
        print("\n✅  Base de datos lista para búsqueda semántica.")
        print("   Reinicia el servidor Netlify dev para activar el RAG.")


if __name__ == "__main__":
    main()
