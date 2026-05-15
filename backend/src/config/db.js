import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'studyprio.sqlite');

export async function getDbConnection() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  // Foreign Keys zwingend aktivieren
  await db.exec('PRAGMA foreign_keys = ON;');
  
  return db;
}