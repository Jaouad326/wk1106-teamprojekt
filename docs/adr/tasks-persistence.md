# ADR-TASK-01 – Aufgaben in derselben SQLite-Datenbank speichern

Datum: 23.09.2026. Im Aufgabenmodul umgesetzt; gemeinsame Anschlussentscheidungen
(Gruppenlöschung, Montage) müssen vom Team bestätigt werden. Kein historisches ADR.

## Kontext

Der vorhandene Main nutzt `sqlite/sqlite3` für Kommentare. Jaouads Auth-Branch legt
`users` und Sitzungen in SQLite an. Tasks brauchen zuverlässige Beziehungen zu Nutzern,
Gruppen und Kommentaren. Deadline 25.09.; lokale Inbetriebnahme muss für das Team
reproduzierbar bleiben. Firebase war eine ältere Vorplanung und wurde laut Auftrag
durch eigene API und Datenhaltung ersetzt.

## Abgewogene Alternativen

1. **Firebase/Firestore:** entspräche der alten TEAMINFO, benötigte aber einen Wechsel
   bereits vorhandener SQL-Module und andere Regeln für Referenzen/Kaskaden. Die
   Aufgabenverwaltung müsste zwei Datenhaltungsmodelle miteinander verbinden.
2. **PostgreSQL:** relational mit leistungsfähigerem parallelem Schreiben; verlangt
   zusätzlich Datenbankdienst, Zugangskonfiguration und Umstellung vorhandener SQLite-
   Module. Für diese Abgabe entstand daraus zusätzlicher Integrationsaufwand.
3. **Gemeinsame SQLite-Datei:** schließt unmittelbar an Auth/Kommentare an, erlaubt echte
   FK-Beziehungen und eine atomare Task-/Kommentarlöschung. Ein gleichzeitiger Writer
   begrenzt allerdings parallele Schreiblast; keine verteilte Cloud-Datenbank.

Diese Gegenüberstellung ist eine technische Bewertung des vorliegenden Projekts.
Es wurden keine Firebase-/PostgreSQL-Prototypen oder Vergleichsbenchmarks durchgeführt.

## Entscheidung und Umsetzung

TaskRepository verwendet den injizierten gemeinsamen `openDb`. `tasks` referenziert
`users` und `groups`; das bestehende Kommentarschema referenziert `tasks` mit
`ON DELETE CASCADE`. SQL nutzt feste Spalten und gebundene Parameter, kein ORM.
Checks ergänzen die API-Validierung. Eine Task-Schreiboperation reserviert vor ihrer
Rechteprüfung per `BEGIN IMMEDIATE` den Schreibzugriff auf dieselbe SQLite-Datei.

Für Aufgabenbeziehungen zu Nutzer/Gruppe gilt vorerst `ON DELETE RESTRICT`:
kein stiller Verlust aller Gruppenaufgaben durch eine noch nicht abgestimmte
Gruppenlöschfunktion. Haizam muss diesen Punkt im Gesamtprojekt ausdrücklich auflösen.

## Konsequenzen

Positiv: keine neue Laufzeitabhängigkeit; einheitliches Datenmodell; reproduzierbare
Tests in echten temporären SQLite-Dateien; Task und Kommentare werden gemeinsam gelöscht.

Negativ: feste Migrationsreihenfolge; fehlende Gruppen-/Nutzertabellen blockieren die
Task-Migration. Schreiboperationen können wegen DB-Sperre 503 liefern. Die
AccessService-Prüfmethoden müssen innerhalb der Task-Schreibtransaktion reine Leser
bleiben. Skalierung auf mehrere schreibende Server erfordert eine Neubewertung.
Das aktuelle `CREATE TABLE IF NOT EXISTS` migriert keine abweichenden Altversionen.

## Nachweis

Tests prüfen Persistenz nach neuer Serviceinstanz, Fremdschlüssel, Kommentar-Kaskade,
Migration bei Wiederholung, asynchrone Rechte und parallele Änderungen. Seit 24.09. ergänzen echte Auth-/Gruppenmodule diese Prüfungen. Ein Lasttest und
die finale gemeinsame Root-Montage sind damit nicht belegt; siehe [Prüfprotokoll](../tasks-verification.md).
