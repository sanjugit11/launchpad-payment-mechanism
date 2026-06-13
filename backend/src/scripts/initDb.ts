import fs from 'fs';
import path from 'path';
import pool from '../config/db';

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Read the schema file
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Split queries and execute
    const queries = schemaSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    for (const query of queries) {
      console.log(`Executing: ${query.substring(0, 50)}...`);
      await pool.query(query);
    }

    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
