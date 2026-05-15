-- ================================================
-- Tu Proceso Legal — Seed: Códigos Legales de Panamá
-- Version: 1.0.0
--
-- Populates the legal_codes catalog.
-- Articles are loaded separately via the Python scraper
-- (see database/scraper/README.md).
-- ================================================

INSERT INTO public.legal_codes
  (code_key, name, branch, description, official_url, last_revised)
VALUES
  (
    'constitucion',
    'Constitución Política de la República de Panamá',
    'const_',
    'Norma suprema del ordenamiento jurídico panameño. Adoptada en 1972 con reformas en 1978, 1983, 1994 y 2004. Reconoce los derechos y garantías fundamentales de todos los ciudadanos.',
    'https://www.asamblea.gob.pa/APPS/LEGISPAN/PDF_NORMAS/1970/1972/1972_412_0581.PDF',
    '2004-11-15'
  ),
  (
    'penal',
    'Código Penal de la República de Panamá',
    'penal',
    'Ley 14 del 18 de mayo de 2007, modificada por Ley 26 de 2008 y otras reformas. Define los delitos, las faltas y las sanciones aplicables en la República de Panamá.',
    'https://www.organojudicial.gob.pa/uploads/wp-content/blogs.dir/adjuntos/2011/09/CODIGO_PENAL.pdf',
    '2022-06-01'
  ),
  (
    'proc_penal',
    'Código Procesal Penal de la República de Panamá',
    'penal',
    'Ley 63 del 28 de agosto de 2008. Establece el sistema penal acusatorio, los derechos del imputado, el rol del fiscal, la defensa pública y el proceso oral.',
    'https://www.organojudicial.gob.pa/uploads/wp-content/blogs.dir/adjuntos/2011/09/CODIGO_PROCESAL_PENAL.pdf',
    '2020-03-01'
  ),
  (
    'civil',
    'Código Civil de la República de Panamá',
    'civil',
    'Regula las relaciones jurídicas entre particulares: contratos, obligaciones, bienes, propiedad, sucesiones y personas naturales o jurídicas.',
    'https://www.organojudicial.gob.pa/uploads/wp-content/blogs.dir/adjuntos/2011/09/CODIGO_CIVIL.pdf',
    '2021-01-01'
  ),
  (
    'familia',
    'Código de Familia de la República de Panamá',
    'familia',
    'Ley 3 del 17 de mayo de 1994. Regula el matrimonio, la unión de hecho, el divorcio, la filiación, la patria potestad, los alimentos, la adopción y la tutela.',
    'https://www.organojudicial.gob.pa/uploads/wp-content/blogs.dir/adjuntos/2011/09/CODIGO_DE_FAMILIA.pdf',
    '2019-08-01'
  ),
  (
    'laboral',
    'Código de Trabajo de la República de Panamá',
    'laboral',
    'Decreto Ley 5 del 25 de agosto de 1975, con múltiples reformas. Regula el contrato de trabajo, los derechos del trabajador, el salario mínimo, la seguridad social y la terminación de contratos.',
    'https://www.mitradel.gob.pa/wp-content/uploads/2013/04/codigo-de-trabajo.pdf',
    '2022-04-01'
  ),
  (
    'comercial',
    'Código de Comercio de la República de Panamá',
    'comercial',
    'Regula las actividades mercantiles, las sociedades anónimas, los contratos de compraventa, el transporte, los títulos-valores y el comercio en general.',
    'https://www.mici.gob.pa/imagenes/pdf/codigo_de_comercio.pdf',
    '2020-01-01'
  ),
  (
    'fiscal',
    'Código Fiscal de la República de Panamá',
    'tributario',
    'Regula el sistema tributario nacional: Impuesto Sobre la Renta (ISR), ITBMS, timbres, exenciones y las obligaciones de personas naturales y jurídicas ante la DGI.',
    'https://www.dgi.gob.pa/index.php/normatividad/codigo-fiscal',
    '2023-01-01'
  ),
  (
    'proc_civil',
    'Código Judicial (Procedimiento Civil)',
    'civil',
    'Regula el proceso civil, los recursos judiciales, la ejecución de sentencias, las medidas cautelares y la organización del Órgano Judicial en Panamá.',
    'https://www.organojudicial.gob.pa/uploads/wp-content/blogs.dir/adjuntos/2011/09/CODIGO_JUDICIAL_LI_II_III_IV.pdf',
    '2021-01-01'
  ),
  (
    'admin',
    'Ley 38 de 2000 — Procedimiento Administrativo General',
    'admin',
    'Regula el procedimiento administrativo general, los recursos contra actos administrativos, la responsabilidad del Estado y la jurisdicción contencioso-administrativa.',
    'https://www.minterior.gob.pa/images/stories/ley38_2000.pdf',
    '2020-01-01'
  ),
  (
    'contratacion',
    'Ley 22 de 2006 — Contratación Pública',
    'admin',
    'Regula la contratación pública en Panamá: licitaciones públicas, concursos de precios, compras directas, contratos con el Estado y el sistema PanamaCompra.',
    'https://www.panama-compra.gob.pa/sites/default/files/normativa/Ley_22_de_2006_y_modificaciones.pdf',
    '2022-08-01'
  ),
  (
    'ambiental',
    'Ley 41 de 1998 — Ley General de Ambiente',
    'ambiental',
    'Ley General de Ambiente de la República de Panamá. Establece los principios básicos para la protección, conservación y uso sostenible de los recursos naturales.',
    'https://www.miambiente.gob.pa/images/stories/Ley41_1998.pdf',
    '2021-06-01'
  ),
  (
    'maritimo',
    'Ley 57 de 2008 — Código de Comercio Marítimo',
    'maritimo',
    'Regula el comercio marítimo, la matrícula de naves, los contratos de transporte marítimo, el arrendamiento de buques y las actividades del Canal de Panamá.',
    'https://www.mici.gob.pa/imagenes/pdf/ley57_2008.pdf',
    '2018-01-01'
  ),
  (
    'bancario',
    'Decreto Ley 9 de 1998 — Ley Bancaria',
    'bancario',
    'Regula el sistema bancario de Panamá, las licencias bancarias, las operaciones financieras permitidas y el rol de la Superintendencia de Bancos (SBP).',
    'https://www.superbancos.gob.pa/bancos/images/Publicaciones/Leyes/decreto_ley_9_1998.pdf',
    '2021-03-01'
  ),
  (
    'pi',
    'Ley 35 de 1996 — Propiedad Industrial',
    'pi',
    'Regula los derechos de propiedad industrial en Panamá: patentes de invención, marcas comerciales, diseños industriales y la protección contra competencia desleal.',
    'https://www.mici.gob.pa/imagenes/pdf/ley35_1996.pdf',
    '2020-08-01'
  ),
  (
    'derechos_autor',
    'Ley 64 de 2012 — Derecho de Autor',
    'pi',
    'Protege las obras literarias, artísticas, musicales, audiovisuales y de software. Regula los derechos morales y patrimoniales de los autores en Panamá.',
    'https://www.mici.gob.pa/imagenes/pdf/ley64_2012.pdf',
    '2020-01-01'
  ),
  (
    'consumidor',
    'Ley 45 de 2007 — Protección al Consumidor',
    'consumidor',
    'Regula la protección de los derechos del consumidor, prohíbe prácticas monopolísticas y publicidad engañosa. Entidad reguladora: ACODECO.',
    'https://www.acodeco.gob.pa/wp-content/uploads/2019/05/Ley45_31Octubre2007.pdf',
    '2022-01-01'
  ),
  (
    'agrario',
    'Código Agrario — Decreto Ley 2 de 1962',
    'agrario',
    'Regula la tenencia de la tierra, la reforma agraria, el catastro rural y las actividades agropecuarias en la República de Panamá.',
    'https://www.mida.gob.pa/upload/documentos/codigoagrario.pdf',
    '2019-01-01'
  ),
  (
    'seg_social',
    'Ley 51 de 2005 — Ley Orgánica de la CSS',
    'laboral',
    'Regula el sistema de seguridad social panameño: las cotizaciones, los beneficios de enfermedad, maternidad, invalidez, vejez y los programas de la Caja de Seguro Social.',
    'https://www.css.gob.pa/web/documentos/ley_51_2005.pdf',
    '2021-01-01'
  ),
  (
    'internacional_priv',
    'Libro IV Código Civil — DIPr',
    'internacional',
    'Regula el Derecho Internacional Privado en Panamá: conflictos de leyes, reconocimiento de sentencias extranjeras, estatuto personal y contratos internacionales.',
    'https://www.organojudicial.gob.pa/',
    '2021-01-01'
  )
ON CONFLICT (code_key) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  official_url = EXCLUDED.official_url,
  last_revised = EXCLUDED.last_revised;
