import { getDbConnection } from '../config/db.js';
import { up as commentsMigration } from '../modules/comments/commentMigration.js';
import { up as authMigration } from '../modules/auth/authMigration.js';
import { up as groupsMigration } from '../modules/groups/groupMigration.js';

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

    await authMigration(db);
    console.log('Migration für Anmeldung erfolgreich.');
    // Die Migrationen sind wiederholbar und erhalten bestehende Daten.
    await commentsMigration(db);
    console.log('Migration für Kommentare erfolgreich.');
    await groupsMigration(db);
    console.log('Migration für Gruppen erfolgreich.');

  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

runMigrations();
