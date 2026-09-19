import { getDbConnection } from '../config/db.js';

async function runMigrations() {
  console.log('Starte Datenbank-Migrationen...');
  const db = await getDbConnection();

  try {
    // Hier folgen später die Tabellen der anderen Module.
    // Beispiel-Infrastruktur-Tabelle, um die DB zu testen:
    await db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Migrationen erfolgreich abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Migration:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigrations();