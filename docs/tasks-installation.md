# Installation und Start von Amins Aufgabenbereich

Diese Anleitung startet die getrennte lokale Prüfanwendung mit den echten Auth-
und Gruppenmodulen. Die gemeinsame Anwendung und `main` werden nicht umgebaut.

## Voraussetzungen

- Geklontes Repository `Jaouad326/wk1106-teamprojekt` mit Amins neuen Dateien.
- Git, Node.js 24 und npm; geprüft mit Node 24.19.0 / npm 11.9.0.
- Netzwerkzugriff für Git-Fetch und einmalige Installation aus den vorhandenen Lockfiles.
- Freier lokaler Port 5175. Keine SMTP-Zugangsdaten erforderlich.

Branch abrufen oder Paketübernahme per Patch/Dateienkopie: [Übergabe, Abschnitt 3](tasks-handoff.md).
Arbeit auf einem eigenen Branch; kein Merge nach `main` für diesen Prüfstart nötig.

## Installieren

Aus dem Hauptverzeichnis des geklonten Repositorys, je Befehl eine Zeile:

```bash
git fetch origin
cd backend
npm ci
cd ../frontend
npm ci
cd ../backend
node tests/tasks/start-team.mjs
```

Diese Befehle funktionieren auch in PowerShell. Der Helfer prüft die dokumentierten
Team-Commits, legt temporäre detached Worktrees an und nutzt die installierten
Abhängigkeiten. Er erstellt keine Commits und schreibt nichts ins Remote-Repository.

## Benutzen

1. `http://localhost:5175/team.html` öffnen. Für Anmeldung und Folgeseiten denselben
   Hostnamen `localhost` beibehalten, da Jaouads Schreibschutz den Origin prüft.
2. `amin-test@campus.example` eingeben und Anmeldelink anfordern.
3. Den Link aus dem Startterminal im selben Browser öffnen; Anmeldung bestätigen.
4. Persönliche und Gruppenaufgaben anlegen, bearbeiten, erledigen, wieder öffnen
   und nach Bestätigung löschen. „Aktualisieren“ lädt Aufgaben und Gruppen erneut.
5. Strg+C im Terminal beendet die Prüfanwendung und entfernt temporäre Worktrees/Daten.

`campus.example` ist eine fiktive Testdomain. E-Mails werden nur im Terminal ausgegeben.
Es werden keine echten Teamkonten benutzt. Browser-Neuladen erhält Sitzung und Aufgaben
während des laufenden Tests. Nach regulärem Stop beginnt der nächste Prüfstart mit
neuen Testdaten. Diese absichtliche Testbereinigung betrifft keine Produktivdatenbank.

Das Produktivmodul speichert in der von `openDb` geöffneten gemeinsamen SQLite-Datei.
Für dauerhaften Team-Betrieb übernimmt der gemeinsame Start einen stabilen,
schreibbaren `DATABASE_PATH`; alle Module verwenden dieselbe Datei. Geprüfte
Migrationsreihenfolge und Montage: [Team-Integration](tasks-team-integration.md).

## Automatisiert prüfen

Im Backend-Verzeichnis:

```bash
node --test tests/tasks/*.test.js
node tests/tasks/start-team.mjs --test
```

Für die Browserprüfung ist zusätzlich Playwright samt Chromium erforderlich; es ist
keine Laufzeitabhängigkeit der App. `node tests/tasks/start-team.mjs --browser` startet
und beendet seinen eigenen Prüfserver. `PLAYWRIGHT_MODULE` (Modul-URL) und
`TASK_CHROMIUM` (absoluter ausführbarer Pfad) können vorhandene Installationen angeben.

Build ohne Server oder echten Mailversand, Bash:

```bash
TASK_BUILD_OUT=/tmp/studyprio-team-build node tests/tasks/start-team.mjs --build
```

PowerShell:

```powershell
$env:TASK_BUILD_OUT = "$env:TEMP/studyprio-team-build"
node tests/tasks/start-team.mjs --build
```

Nur einen temporären Ausgabeordner verwenden: Der Testbuild leert diesen Ordner.

## Bei Startproblemen

| Meldung/Symptom | Behebung |
|---|---|
| Team-Commits fehlen | Im Repository `git fetch origin`; Zugriff auf das richtige Team-Repository prüfen |
| `node_modules` fehlt | `npm ci` sowohl in `backend` als auch `frontend` ausführen |
| Port 5175 belegt | Vorherigen Prüfstart mit Strg+C beenden; dann erneut starten |
| Anmeldelink nicht sichtbar | Nach der Anforderung das Startterminal prüfen, nicht ein echtes Postfach |
| Schreibrequest mit 403 | Durchgängig `http://localhost:5175` benutzen; frische Anmeldung durchführen; gegebenenfalls Gruppenmitgliedschaft aktualisieren |
| Gruppenliste lädt nicht | Meldung beachten, persönliche Aufgaben bleiben nutzbar; „Aktualisieren“ erneut versuchen |

Tatsächliche Testergebnisse: [Prüfprotokoll](tasks-verification.md).
Abgrenzung zur noch offenen Team-Integration: [Abschluss](tasks-readiness.md).
