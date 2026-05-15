"""
Tu Proceso Legal — Legal Article Scraper & Importer
====================================================
Loads Panamanian legal articles into the legal_articles table.

Usage:
    pip install psycopg2-binary python-dotenv requests beautifulsoup4 lxml
    python database/scraper/scrape_articles.py

The script:
  1. Reads DB_URL from database/.env
  2. Loads the existing legal_codes from the DB
  3. Imports sample articles for demonstration
  4. (Optional) Scrapes official government PDFs/websites

To add real articles, extend the SAMPLE_ARTICLES dict or implement
the scraping logic in scrape_code_from_url().
"""

import os
import sys
import uuid
import json
import psycopg2
from dotenv import load_dotenv

# ── Config ────────────────────────────────────────
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(ENV_PATH)

DB_URL = os.getenv('DB_URL')

if not DB_URL:
    print('\n  ERROR: DB_URL not found in database/.env\n')
    sys.exit(1)

# ── Sample articles per code ──────────────────────
# Structure: { code_key: [ (article_number, title, content, [keywords]) ] }
SAMPLE_ARTICLES = {
    'constitucion': [
        (
            'Artículo 1',
            'Estado panameño',
            'La Nación panameña está organizada en Estado soberano e independiente, '
            'cuya denominación es República de Panamá. Su Gobierno es unitario, republicano, '
            'democrático y representativo.',
            ['estado', 'soberanía', 'república', 'gobierno', 'democracia'],
        ),
        (
            'Artículo 17',
            'Derechos individuales',
            'Las autoridades de la República están instituidas para proteger en su vida, '
            'honra y bienes a los nacionales donde quiera que se encuentren y a los '
            'extranjeros que estén bajo su jurisdicción; asegurar la efectividad de los '
            'derechos y deberes individuales y sociales, y cumplir y hacer cumplir la '
            'Constitución y la Ley.',
            ['derechos', 'garantías', 'protección', 'individuales', 'sociales'],
        ),
        (
            'Artículo 32',
            'Debido proceso',
            'Nadie será juzgado sino por autoridad competente y conforme a los trámites '
            'legales, y no más de una vez por la misma causa penal, administrativa, '
            'policial o disciplinaria.',
            ['debido proceso', 'juicio justo', 'non bis in idem', 'garantías'],
        ),
        (
            'Artículo 48',
            'Libertad de expresión',
            'Toda persona puede emitir libremente su pensamiento de palabra, por escrito '
            'u otro medio, sin sujeción a censura previa, pero existirán responsabilidades '
            'legales cuando por alguno de estos medios se atente contra la reputación o la '
            'honra de las personas o contra la seguridad social o el orden público.',
            ['libertad', 'expresión', 'prensa', 'censura', 'honra'],
        ),
    ],
    'penal': [
        (
            'Artículo 1',
            'Principio de legalidad',
            'Nadie podrá ser procesado ni penado por un hecho no descrito expresamente '
            'como delito por la ley penal anterior a su perpetración. Las medidas de '
            'seguridad solo podrán aplicarse cuando el hecho punible y la medida '
            'se encuentren previamente establecidos en la ley.',
            ['legalidad', 'delito', 'pena', 'ley previa', 'principio'],
        ),
        (
            'Artículo 2',
            'Irretroactividad de la ley penal',
            'La ley penal no tiene efecto retroactivo, excepto cuando favorezca al '
            'imputado o al penado. Cuando la ley nueva favorece al imputado o penado '
            'se aplicará aunque la sentencia esté ejecutoriada.',
            ['irretroactividad', 'retroactividad', 'favorabilidad', 'imputado'],
        ),
        (
            'Artículo 132',
            'Homicidio doloso',
            'Quien cause la muerte de otro será sancionado con prisión de diez a veinte años. '
            'La sanción será de quince a veinte años cuando el hecho se cometa con alevosía, '
            'premeditación, ensañamiento, o con aprovechamiento de la indefensión de la víctima.',
            ['homicidio', 'muerte', 'prisión', 'alevosía', 'premeditación'],
        ),
        (
            'Artículo 200',
            'Hurto',
            'Quien se apodere de cosa mueble ajena con ánimo de lucro, sin el consentimiento '
            'de su dueño o poseedor y sin que concurran las circunstancias del robo, '
            'será sancionado con prisión de dos a cuatro años.',
            ['hurto', 'robo', 'apoderamiento', 'lucro', 'patrimonio'],
        ),
        (
            'Artículo 220',
            'Estafa',
            'Quien defraudare a otro, induciéndolo mediante engaño a realizar un acto o '
            'negocio jurídico que le ocasione perjuicio a sí mismo o a un tercero, en '
            'beneficio propio o ajeno, será sancionado con prisión de dos a cuatro años.',
            ['estafa', 'fraude', 'engaño', 'defraudar', 'perjuicio'],
        ),
    ],
    'laboral': [
        (
            'Artículo 1',
            'Ámbito de aplicación',
            'El presente Código regula las relaciones entre el capital y el trabajo, '
            'estableciendo la protección especial del Estado en beneficio de los '
            'trabajadores para garantizar a estos, la estabilidad en el empleo y su '
            'mejoramiento económico y social.',
            ['trabajo', 'trabajador', 'empleador', 'capital', 'protección'],
        ),
        (
            'Artículo 68',
            'Período de prueba',
            'En todo contrato de trabajo habrá un período de prueba de tres meses. '
            'Durante este tiempo cualquiera de las partes puede dar por terminado '
            'el contrato sin responsabilidad alguna.',
            ['período de prueba', 'contrato', 'terminación', 'tres meses'],
        ),
        (
            'Artículo 95',
            'Décimo tercer mes',
            'Todo trabajador tiene derecho a percibir una prima de antigüedad '
            'denominada décimo tercer mes, equivalente a la doceava parte del total '
            'de lo percibido durante el año de servicios prestados al empleador.',
            ['décimo tercer mes', 'prima', 'antigüedad', 'salario', 'beneficio'],
        ),
        (
            'Artículo 213',
            'Causas justas de despido',
            'Son causas justas para terminar el contrato de trabajo por voluntad '
            'del empleador, entre otras: la falta de probidad o actos deshonestos '
            'del trabajador, la violencia o malos tratos contra el empleador, '
            'y el incumplimiento grave de las obligaciones del trabajador.',
            ['despido', 'causa justa', 'terminación', 'contrato', 'empleador'],
        ),
        (
            'Artículo 222',
            'Indemnización por despido injustificado',
            'Si el contrato de trabajo por tiempo indefinido fuere resuelto por '
            'voluntad unilateral del empleador, sin causa justificada, el trabajador '
            'tendrá derecho a una indemnización equivalente a la semana y media de '
            'salario por cada año de servicio.',
            ['indemnización', 'despido injustificado', 'semana y media', 'salario'],
        ),
    ],
    'familia': [
        (
            'Artículo 1',
            'Objeto del Código de Familia',
            'El presente Código regula las relaciones jurídicas derivadas de la '
            'familia, el matrimonio, la unión de hecho, la filiación, los alimentos, '
            'la tutela, la curatela y la adopción, así como la protección de los '
            'menores y la familia.',
            ['familia', 'matrimonio', 'filiación', 'alimentos', 'menores'],
        ),
        (
            'Artículo 53',
            'Causales de divorcio',
            'Son causales de divorcio: el adulterio, el maltrato de obra o de '
            'palabra que haga insoportable la vida en común, la separación de '
            'hecho por más de dos años, la condena por delito doloso y otras '
            'causales establecidas en este Código.',
            ['divorcio', 'causales', 'adulterio', 'maltrato', 'separación'],
        ),
        (
            'Artículo 324',
            'Pensión alimenticia',
            'La pensión alimenticia comprende todo lo necesario para el sustento, '
            'habitación, vestido, atención médica y educación del beneficiario. '
            'Se fijará teniendo en cuenta las necesidades del alimentario y las '
            'posibilidades económicas del obligado.',
            ['alimentos', 'pensión alimenticia', 'sustento', 'educación', 'menor'],
        ),
        (
            'Artículo 346',
            'Patria potestad',
            'La patria potestad comprende el conjunto de deberes y derechos que '
            'tienen los padres sobre la persona y bienes de sus hijos no emancipados. '
            'Se ejercerá siempre en beneficio de los hijos.',
            ['patria potestad', 'padres', 'hijos', 'custodia', 'menores'],
        ),
    ],
    'civil': [
        (
            'Artículo 1',
            'Obligatoriedad de la ley',
            'La ley es obligatoria para todos los habitantes de la República. '
            'Se presumirá conocida desde su publicación en la Gaceta Oficial.',
            ['ley', 'obligatoriedad', 'conocimiento', 'publicación'],
        ),
        (
            'Artículo 1109',
            'Definición de contrato',
            'El contrato es un acuerdo de dos o más personas para constituir, reglar, '
            'transmitir, modificar o extinguir entre ellas un vínculo jurídico.',
            ['contrato', 'acuerdo', 'obligaciones', 'vínculo jurídico'],
        ),
        (
            'Artículo 1113',
            'Requisitos del contrato',
            'Para que un contrato sea válido se requieren: consentimiento de los '
            'contratantes, objeto cierto que sea materia del contrato, y causa '
            'de la obligación que se establezca.',
            ['contrato', 'validez', 'consentimiento', 'objeto', 'causa'],
        ),
        (
            'Artículo 1644',
            'Definición de herencia',
            'La herencia comprende todos los bienes, derechos y obligaciones de una '
            'persona que no se extingan por su muerte. El heredero responde de las '
            'deudas de la herencia con los bienes de ésta.',
            ['herencia', 'sucesión', 'bienes', 'deudas', 'fallecimiento'],
        ),
    ],
    'fiscal': [
        (
            'Artículo 694',
            'Impuesto sobre la renta — Hecho generador',
            'Están sujetos al impuesto sobre la renta establecido en este Título, '
            'las personas naturales o jurídicas que obtengan renta gravable dentro '
            'del territorio de la República de Panamá.',
            ['ISR', 'impuesto', 'renta', 'contribuyente', 'DGI'],
        ),
        (
            'Artículo 701',
            'Tasa del impuesto sobre la renta (personas naturales)',
            'Las personas naturales que obtengan renta neta gravable pagarán el '
            'impuesto con base en la siguiente tarifa: renta de $11,000 a $50,000: '
            '15%; renta de más de $50,000: 25%.',
            ['ISR', 'tarifa', 'persona natural', 'renta neta', 'porcentaje'],
        ),
        (
            'Artículo 1057-V',
            'ITBMS — Impuesto de transferencia de bienes y servicios',
            'Se establece el ITBMS a una tasa del 7% sobre las transferencias de '
            'bienes corporales muebles y la prestación de servicios en el territorio '
            'nacional. Algunos bienes y servicios están exentos.',
            ['ITBMS', 'IVA', '7%', 'bienes', 'servicios', 'exención'],
        ),
    ],
}


def get_connection():
    """Create and return a psycopg2 connection."""
    return psycopg2.connect(DB_URL, sslmode='require')


def load_code_ids(cur):
    """Return a dict { code_key: uuid } from legal_codes."""
    cur.execute('SELECT code_key, id FROM public.legal_codes;')
    return {row[0]: row[1] for row in cur.fetchall()}


def upsert_articles(cur, code_id, branch, articles):
    """Insert or update articles for a given code."""
    count = 0
    for article_number, title, content, keywords in articles:
        cur.execute(
            """
            INSERT INTO public.legal_articles
              (id, code_id, article_number, title, content, branch, keywords)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (code_id, article_number) DO UPDATE SET
              title    = EXCLUDED.title,
              content  = EXCLUDED.content,
              branch   = EXCLUDED.branch,
              keywords = EXCLUDED.keywords,
              updated_at = now();
            """,
            (
                str(uuid.uuid4()),
                code_id,
                article_number,
                title,
                content,
                branch,
                keywords,
            ),
        )
        count += 1
    return count


def main():
    print('\n  Tu Proceso Legal — Legal Article Importer')
    print('  ==========================================\n')

    conn = get_connection()
    cur  = conn.cursor()

    print('  Connected to Supabase PostgreSQL.\n')

    # Load existing code IDs + their branches
    code_ids = load_code_ids(cur)
    cur.execute('SELECT code_key, branch FROM public.legal_codes;')
    branches = {row[0]: row[1] for row in cur.fetchall()}

    total = 0
    for code_key, articles in SAMPLE_ARTICLES.items():
        if code_key not in code_ids:
            print(f'  SKIP  {code_key} — not found in legal_codes table')
            continue

        code_id = code_ids[code_key]
        branch  = branches.get(code_key, '')
        count   = upsert_articles(cur, code_id, branch, articles)
        total  += count
        print(f'  OK    {code_key:<25}  {count} article(s)')

    conn.commit()
    cur.close()
    conn.close()

    print(f'\n  ✓ Imported {total} article(s) successfully.\n')
    print('  You can now search them with:')
    print("    SELECT * FROM legal_articles")
    print("    WHERE search_vector @@ plainto_tsquery('spanish', 'divorcio custodia');\n")


if __name__ == '__main__':
    main()
