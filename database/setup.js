/**
 * Tu Proceso Legal — Database Setup Script
 *
 * Applies the full schema, RLS policies and seed data to the
 * Supabase PostgreSQL instance.
 *
 * Usage:
 *   1. Copy .env.example → .env and fill in DB_URL
 *   2. npm install  (installs pg + dotenv)
 *   3. node database/setup.js
 *
 * Where to find DB_URL:
 *   Supabase Dashboard → Settings → Database → Connection string → URI
 *   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
 */

'use strict';

const { Client } = require('pg');
const fs         = require('fs');
const path       = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  console.error('\n  ERROR: DB_URL not found.\n');
  console.error('  Copy database/.env.example → database/.env and fill in your Supabase connection string.\n');
  process.exit(1);
}

const SQL_FILES = [
  '01_schema.sql',
  '02_rls.sql',
  '03_seed_codes.sql',
];

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('\n  Connected to Supabase PostgreSQL.\n');

    for (const file of SQL_FILES) {
      const filePath = path.join(__dirname, file);
      const sql      = fs.readFileSync(filePath, 'utf8');

      process.stdout.write(`  Applying ${file} … `);
      await client.query(sql);
      console.log('done');
    }

    console.log('\n  ✓ Database setup complete.\n');
    console.log('  Tables created: profiles, conversations, messages,');
    console.log('                  quiz_results, user_documents,');
    console.log('                  legal_codes, legal_articles, query_analytics\n');
    console.log('  Next step: populate legal_articles using the Python scraper.');
    console.log('  See database/scraper/ for instructions.\n');

  } catch (err) {
    console.error('\n  ERROR during setup:', err.message, '\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
