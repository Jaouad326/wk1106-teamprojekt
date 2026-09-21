import { getDbConnection } from '../config/db.js';
import { up as commentsMigration } from '../modules/comments/commentMigration.js';

async function runMigrations() {
  console.log('Starte Datenbank-Migrationen...');
  const db = await getDbConnection();

  try {
    // 1. Die Basis-Tabelle vom Setup
    await db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Die neuen Kommentar-Tabelle werden erstellt
    await commentsMigration(db);
    console.log('Migration für Kommentare erfolgreich.');

  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigrations();