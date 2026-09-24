# Aufgaben mit echten Teammodulen – Stand 24.09.2026

Dieses Dokument ergänzt die [Übergabe](tasks-handoff.md). Der Gruppen-Branch ist
inzwischen verfügbar. Die vorher ausdrücklich offene Prüfung mit Haizams echtem
Schema und AccessService wurde nun durchgeführt. Die Aufgabenentwicklung
liegt auf `work/amin-tasks`; fremde Arbeitsdateien und `main` bleiben unverändert.
Die gemeinsame Montage erfolgt später mit dem Team.

## Was jetzt zusammen geprüft ist

| Beitrag | Tatsächlich verwendeter Stand |
|---|---|
| Jaouad | `work/jaouad-auth`, `b8367b3284c510fa1d876fa5ea5ae9b16692f750`: AuthService, Sitzungen, Middleware, API-Client und AuthGate |
| Haizam | `work/haizam-groups`, `78c78b367fd08e1e68dcaf4eabfa424366ff5738`: Groupschema, GroupService, GroupRouter und AccessService |
| Amin | Task-Dateien auf `work/amin-tasks` einschließlich `taskModule.js` und `TasksWorkspace.jsx` |
| Ahshan | `main` bei `7b45b5d`: echtes Kommentarschema für die Task-Löschkaskade |

Der SMTP-Versand wird durch einen Test-Mailtransport ersetzt. Nutzer entstehen
durch echte Linkbestätigung, Cookies durch Jaouads SessionService. Gruppen und
Mitgliedschaften entstehen durch Haizams Service/API. Kein fester Testnutzer und
kein permissiver AccessService wird in dieser Anschlussprüfung verwendet.
Die Testdomain `campus.example` und temporären Daten sind ausdrücklich erfunden.

Der erneute Remote-Abgleich am 24.09. ergab unveränderte SHAs. Vollständige
Auftragsmatrix: [Abschluss](tasks-readiness.md); [Installation](tasks-installation.md).

## Lokal in einem Befehl starten

Voraussetzung: Das Aufgabenpaket liegt im geklonten Repository. Die bestehenden
Backend-/Frontend-Abhängigkeiten wurden wie in der Übergabe mit `npm ci` installiert.

```bash
git fetch origin
cd backend
node tests/tasks/start-team.mjs
```

Öffne `http://localhost:5175/team.html` und melde dich mit
`amin-test@campus.example` an. Den angeforderten Link zeigt ausschließlich das
Terminal an. Öffne ihn im selben Browser und bestätige die Anmeldung. Es erscheint
die echte Anmeldeoberfläche mit Amins Aufgabenansicht und Gruppenauswahl.

Der Starthelfer prüft die oben angegebenen Commitstände, erstellt temporäre
detached Worktrees, verbindet deren Module mit den vorhandenen Abhängigkeiten
und startet den lokalen Prüfaufbau. Strg+C beendet ihn und räumt die temporären
Worktrees auf. Kein Checkout deines Arbeitsbranches, kein Commit, Push oder Merge.
Die Testdaten verschwinden bei regulärem Beenden; Neuladen des Browsers erhält sie.

Die vier automatisierten Anschlussprüfungen starten ohne Browser:

```bash
node tests/tasks/start-team.mjs --test
```

Optional mit installiertem Playwright/Chromium:
`node tests/tasks/start-team.mjs --browser`. `PLAYWRIGHT_MODULE` und `TASK_CHROMIUM`
können auf vorhandene Installationen zeigen. Der Build-Modus `--build` benötigt
einen ausdrücklich temporären `TASK_BUILD_OUT`-Ordner.

## Amins neue Anschlussbausteine

`createTaskModule({openDb,requireAuth,accessService})` erstellt genau eine TaskService-
Instanz und den dazugehörigen Router. Diese Instanz wird auch Dashboard/Details
übergeben. Es entstehen keine abweichenden Zugriffsregeln je Consumer.

`TasksWorkspace` lädt Gruppen über `GET /api/groups`. Es reicht Haizams `id/name`
an das Aufgabenformular weiter. „Aktualisieren“ lädt Aufgaben und Gruppen erneut.
Bei 401/403/404 nach einer Mutation geschieht das ebenfalls. Entfernte Gruppen
verschwinden dadurch aus der Auswahl. Ein Gruppenladefehler wird ausdrücklich
angezeigt; persönliche Aufgaben bleiben nutzbar. Entfällt eine bereits ausgewählte
Gruppe im Neuanlageformular, bleibt diese Auswahl als ungültig erkennbar, bis der
Nutzer ausdrücklich umwählt. Keine zweite Gruppenverwaltung.

## Konkrete Montage im gemeinsamen Start – vom Team zu übernehmen

Der Prüfaufbau belegt das Zusammenspiel der Module; er ersetzt nicht die noch
ausstehende Montage in Jaouads `app.js` bzw. den gemeinsamen Serverstart.

### Datenbank

1. Alle Verbindungen müssen dieselbe SQLite-Datei verwenden und FK aktivieren.
2. Migrationen: `authMigration.up` → `groupMigration.up` → `taskMigration.up`
   → `commentMigration.up`.
3. `PRAGMA foreign_key_check` muss anschließend leer sein. Verwaiste alte Kommentare
   vorab mit dem Team klären. Kein automatisches Löschen historischer Daten.

Haizams echte Mitgliedertabelle heißt `group_members`. Amins Produktivcode greift
nicht direkt auf diesen Namen zu; er nutzt Haizams AccessService. Die Tabelle
`memberships` in der älteren isolierten Fixture bleibt ein ausdrücklich künstliches
Testschema und darf nicht als Produktivmigration übernommen werden.

### Backend

Im gemeinsamen `createApp` stehen die folgenden Zeilen **vor dem `/api`-404-Handler**.
`requireAuth` und `service` sind Jaouads bereits aufgebaute Auth-Abhängigkeiten.
`groupDb` und `accessDb` öffnet der gemeinsame Serverstart vorher über `openDb` und
schließt sie bei regulärem Stop. Den synchronen App-Aufbau dafür mit vorbereiteten
Verbindungen versorgen; nicht unbemerkt in eine asynchrone Funktion umwandeln.

```js
import { createGroupService } from './modules/groups/groupService.js';
import { createGroupRouter } from './modules/groups/groupRoutes.js';
import { createAccessService } from './access/accessService.js';
import { createTaskModule } from './modules/tasks/taskModule.js';

const groups = createGroupService(groupDb, {
  findVerifiedByEmail: service.findVerifiedByEmail
});
const accessService = createAccessService(accessDb);
const { taskService, taskRouter } = createTaskModule({
  openDb, requireAuth, accessService
});
app.use('/api/groups', createGroupRouter(groups, requireAuth));
app.use('/api/tasks', taskRouter);
```

Die eigene Access-Leseverbindung sieht keine unbestätigten Änderungen aus einer
laufenden Gruppen-Schreibtransaktion. Task-Schreibvorgänge verwenden weiterhin
eine eigene Verbindung mit `BEGIN IMMEDIATE`. Haizams Access-Methoden sind reine
asynchrone Leseabfragen und passen zu diesem Vertrag.

`taskService` im Rückgabewert der gemeinsamen App-Fabrik für Bassim/Ahshan bereitstellen.
Globale Sitzungs-/CSRF- und JSON-Middleware bleiben davor. Keine `mockRequireAuth`,
`mockUserDirectory` oder pauschalen Freigaben aus Haizams momentanem `server.js`
in die gemeinsame Anwendung übernehmen.

### Frontend

```jsx
import AuthGate from './features/auth/AuthGate.jsx';
import { api } from './api.js';
import TasksWorkspace from './features/tasks/TasksWorkspace.jsx';

<AuthGate><TasksWorkspace api={api} /></AuthGate>
```

Wenn Ahshans Detailansicht integriert ist, kann `onSelectTask={openTaskDetails}`
ergänzt werden. Ohne diese Funktion zeigt die UI keinen funktionslosen Detailbutton.
Das vorhandene Auth-Layout und die Aufgabenansicht wurden zusammen auf Desktop
und Mobil geprüft; ein breiteres Gesamtlayout kann das Team später gestalten.

## Tatsächlich geprüft

Vier zusätzliche HTTP-/SQLite-Tests mit echten Auth-/Gruppenmodulen bestanden:
Mitgliedschaft und Rechteentzug auch für Task-Ersteller; private Tasks und Sitzungen;
Besitzer bleibt Mitglied und Kommentar-Kaskade; parallele Task-PATCHes.

Browser: echte AuthGate-Anmeldung, echte API-Clients, Gruppenliste, Task anlegen und
bearbeiten, Browser-Neuladen, Rechteentzug bei offenem Dialog, Ablehnung des Speicherns,
Aktualisierung der Gruppen-/Aufgabenliste, Gruppenladefehler samt Erholung,
Gruppenentzug während Neuanlage und ausdrückliche persönliche Zuordnung,
Sichtbarkeit neuer Aufgaben trotz vorherigem Statusfilter, persönliches Löschen und Logout. Desktop
1280×1000 und Mobil 390×844 ohne horizontalen Überlauf oder JavaScript-Fehler.

## Offen für das Team

- Montage in den gemeinsamen Rootdateien und Zusammenführung in `main`.
- Ahshans Kommentarrouter ruft asynchrone Rechte bisher ohne `await` und mit einer ID
  statt einem Task auf; die eigentliche Kommentaroberfläche/API ist deshalb nicht
  Teil des erfolgreichen integrierten Ablaufs. Das SQL-Schema wurde geprüft.
  Seinem Frontend-POST fehlt zusätzlich Jaouads `X-StudyPrio-Request`-Header; hierfür
  den gemeinsamen API-Client im Kommentarmodul verwenden.
- Bassims Priorisierung/Dashboard ist noch nicht verfügbar.
- Echte SMTP-Zustellung und menschliche Teamabnahme bleiben offen.
- Haizams Gruppenmodul hat einen einzelnen gemeinsamen DB-Handle. Parallele
  Gruppentransaktionen müssen vor Gesamtfreigabe von ihm geprüft werden; Amins Tests
  belegen parallele Aufgabenänderungen, nicht die Nebenläufigkeit aller Gruppenoperationen.
- Amins `ON DELETE RESTRICT` für referenzierte Gruppen bleibt bestehen. Eine
  Gruppenlöschfunktion ist im geprüften Gruppenrouter nicht vorhanden.

KI-Unterstützung: ChatGPT/Codex am 24.09.2026 für Anschlussbausteine, Testaufbau und
Dokumentation. Ergebnisse durch die genannten tatsächlichen Tests und Screenshots
geprüft; Amins persönliche Erklärung und Abnahme stehen weiterhin aus.
