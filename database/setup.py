"""
Tu Proceso Legal — Database Setup (Python version)
===================================================
Applies schema, RLS policies, seed data and sample articles
to the Supabase PostgreSQL instance.

Usage:
    pip install psycopg2-binary python-dotenv
    python database/setup.py

Where to find DB_URL:
    Supabase Dashboard → Settings → Database → Connection string → URI
    Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
"""

import os
import sys
import importlib.util
import psycopg2
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, '.env'))

DB_URL = os.getenv('DB_URL')

SQL_FILES = [
    '01_schema.sql',
    '02_rls.sql',
    '03_seed_codes.sql',
]


def get_connection():
    return psycopg2.connect(DB_URL, sslmode='require')


def run_sql_file(cur, filename):
    path = os.path.join(BASE_DIR, filename)
    with open(path, encoding='utf-8') as f:
        sql = f.read()
    cur.execute(sql)


def import_articles(conn):
    """Dynamically import and run the article importer."""
    spec   = importlib.util.spec_from_file_location(
        'scrape_articles',
        os.path.join(BASE_DIR, 'scraper', 'scrape_articles.py'),
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    cur  = conn.cursor()
    code_ids = module.load_code_ids(cur)
    cur.execute('SELECT code_key, branch FROM public.legal_codes;')
    branches = {row[0]: row[1] for row in cur.fetchall()}

    total = 0
    for code_key, articles in module.SAMPLE_ARTICLES.items():
        if code_key not in code_ids:
            continue
        count  = module.upsert_articles(cur, code_ids[code_key], branches.get(code_key, ''), articles)
        total += count
        print(f'  articles  {code_key:<25}  {count} inserted/updated')

    conn.commit()
    cur.close()
    return total


def main():
    if not DB_URL:
        print('\n  ERROR: DB_URL not found.')
        print('  Copy database/.env.example → database/.env and fill in your credentials.\n')
        sys.exit(1)

    print('\n  Tu Proceso Legal — Database Setup')
    print('  ==================================\n')

    conn = get_connection()
    cur  = conn.cursor()
    print('  Connected to Supabase PostgreSQL.\n')

    for filename in SQL_FILES:
        print(f'  Applying {filename} … ', end='', flush=True)
        run_sql_file(cur, filename)
        conn.commit()
        print('done')

    print()
    article_count = import_articles(conn)

    conn.close()

    print(f'\n  ✓ Setup complete.')
    print(f'    Tables ready:   profiles, conversations, messages,')
    print(f'                    quiz_results, user_documents,')
    print(f'                    legal_codes (20), legal_articles ({article_count}),')
    print(f'                    query_analytics\n')


if __name__ == '__main__':
    main()
