# ADR: SQLite als Persistenz

**Status:** umgesetzt  
**Datum:** 25.09.2026

## Kontext
StudyPrio benötigt persistente Daten für Benutzer, Sitzungen, Aufgaben, Gruppen, Einladungen und Kommentare. Der M3-Rahmen verlangt eine lokal nachvollziehbare Anwendung; Mehrserverbetrieb ist nicht Ziel.

## Alternativen
1. SQLite – kein separater Datenbankserver, Transaktionen und Foreign Keys.
2. PostgreSQL – stärker für Mehrserver, aber zusätzlicher Betriebsaufwand.
3. In-Memory – einfach, aber Daten gehen beim Neustart verloren.

## Entscheidung
SQLite wird als gemeinsame persistente Datenbank verwendet. Repositories kapseln SQL-Zugriffe; Foreign Keys, Indizes und Transaktionen werden genutzt.

## Begründung
SQLite passt zur lokalen Installierbarkeit und zum Projektumfang.

## Konsequenzen
Positiv: einfache Inbetriebnahme, persistente Daten, Transaktionen, Testbarkeit mit temporären Datenbanken. Negativ: nicht als Ziel für horizontal verteilte Backend-Instanzen geeignet.

## Nachweis
backend/src/modules/*/*Repository.js, Migrationen und INSTALL.md.
