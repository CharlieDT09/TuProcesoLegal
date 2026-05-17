#!/usr/bin/env python3
"""
ingest_legal_codes.py
=====================
Extrae texto de los PDFs legales panameños, los divide por artículo,
genera embeddings con OpenAI text-embedding-3-small y los sube a
Supabase (tabla legal_documents con pgvector).

Instalación de dependencias:
    pip install pdfplumber openai supabase python-dotenv tqdm

Variables de entorno requeridas (en database/.env o como env vars):
    SUPABASE_URL          — URL de tu proyecto Supabase
    SUPABASE_SERVICE_KEY  — Service Role Key (Settings → API)
    OPENAI_API_KEY        — API key de OpenAI

Uso:
    cd database
    python ingest_legal_codes.py

    # Procesar solo un archivo:
    python ingest_legal_codes.py --file "codigo-de-trabajo.pdf"

    # Ver stats sin subir:
    python ingest_legal_codes.py --dry-run
"""

import os
import re
import sys
import time
import argparse
from pathlib import Path

# ── Dependencias opcionales con mensajes claros ──────────────────
try:
    import pdfplumber
except ImportError:
    sys.exit("❌  Falta pdfplumber. Ejecuta: pip install pdfplumber")

try:
    from openai import OpenAI
except ImportError:
    sys.exit("❌  Falta openai. Ejecuta: pip install openai")

try:
    from supabase import create_client
except ImportError:
    sys.exit("❌  Falta supabase. Ejecuta: pip install supabase")

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # .env es opcional si las vars ya están en el entorno

try:
    from tqdm import tqdm
except ImportError:
    tqdm = None  # fallback sin barra de progreso


# ════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ════════════════════════════════════════════════════════════════

SUPABASE_URL  = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY", "")
OPENAI_KEY    = os.environ.get("OPENAI_API_KEY", "")

# Carpeta con los PDFs (ajusta si es necesario)
PDF_DIR = Path(r"C:\Users\PC\Downloads\codigos\codigos")

EMBED_MODEL     = "text-embedding-3-small"  # 1536 dims — $0.02/M tokens
MAX_CHUNK_CHARS = 2500   # máximo caracteres por chunk de artículo
BATCH_SIZE      = 50     # artículos por llamada a OpenAI + inserción Supabase
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
# EXTRACCIÓN DE TEXTO
# ════════════════════════════════════════════════════════════════

def extract_text(pdf_path: Path) -> str:
    """Extrae todo el texto de un PDF; retorna '' si falla."""
    parts: list[str] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text(x_tolerance=3, y_tolerance=3)
                if t:
                    parts.append(t)
    except Exception as e:
        print(f"    ⚠  Error leyendo {pdf_path.name}: {e}")
    return "\n".join(parts)


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
# EMBEDDINGS (OpenAI)
# ════════════════════════════════════════════════════════════════

def get_embeddings(texts: list[str], client: OpenAI) -> list[list[float]]:
    """Genera embeddings para una lista de textos (un API call por batch)."""
    cleaned = [t.replace("\n", " ").strip()[:8000] for t in texts]  # límite de tokens
    resp = client.embeddings.create(model=EMBED_MODEL, input=cleaned)
    return [item.embedding for item in resp.data]


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
    args = parser.parse_args()

    print("⚖️  Tu Proceso Legal — Ingesta RAG con pgvector\n")

    # Validar configuración
    missing = [v for v in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OPENAI_API_KEY")
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
        openai_client = OpenAI(api_key=OPENAI_KEY)
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

        # 1. Extraer texto
        text = extract_text(pdf_path)
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
                embeddings = get_embeddings(texts, openai_client)
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
    cost_usd   = (tokens_est / 1_000_000) * 0.02

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
