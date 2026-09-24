# Amins Aufgabenpaket – Übergabe und Start

Stand: 24.09.2026. Umgesetzt und geprüft; Arbeits- und Veröffentlichungsbranch:
`work/amin-tasks`. Amin hat Commit und Push dieses Branches am 24.09.2026 beauftragt.
Die Integration in den gemeinsamen Start und nach `main` bleibt der spätere Teamschritt.
Das Paket enthält nur neue Dateien in Amins Modul-, Test- und Dokumentationsbereichen.
Kein bestehender Teamcode, keine Identität und keine Historie wurde geändert.

Vollständigkeitsmatrix: [Abschluss und Integrationsvertrag](tasks-readiness.md).
Eigenständige Startanleitung: [Installation](tasks-installation.md).

## Neu am 24.09.: echter Team-Anschluss

Haizams Gruppenmodul ist jetzt verfügbar und mit Amins Aufgabenverwaltung sowie
Jaouads AuthGate/Session/API erfolgreich geprüft. Der neue einfache Prüfstart ist
`node tests/tasks/start-team.mjs` im Backend. Siehe
[aktuelle Team-Integration](tasks-team-integration.md) für Start und konkrete Montage.
Die bisherigen isolierten Prüfungen bleiben zusätzlich enthalten.

## 1. Geprüfte Ausgangspunkte

- `main`: `7b45b5d81dcfa0d15a5aa8f533f41362fc0b1569`.
- Jaouads `work/jaouad-auth`: `b8367b3284c510fa1d876fa5ea5ae9b16692f750`.
- Haizams `work/haizam-groups`: `78c78b367fd08e1e68dcaf4eabfa424366ff5738`.
- Main und Auth unverändert; Gruppen-Branch am 24.09. neu hinzugekommen.
- Bassims Priorisierung liegt noch nicht im Repository.
- Der geschlossene Planungs-PR ist keine übernommene Grundlage.
- Der alte Zieltermin 17.09. aus dem Auftrag liegt bereits zurück; die vorliegende
  Umsetzung erfolgte am 23.–24.09.2026. Keine frühere Fertigstellung wird behauptet.

Die verbindliche [Kurs-README](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/README.md),
[Bewertung](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/BEWERTUNG.md),
TEAMINFO-Vorlage sowie Tutorials zu Conventional Commits und Git-Identität wurden
gelesen. Originalmails/Moodle/PDFs lagen nicht vor; zusätzliche Mailhinweise stammen
aus Amins beigefügtem Text. Abgabe bleibt Freitag, 25.09.2026, durch das Team.

## 2. Dateien und Verantwortung

| Pfad | Inhalt |
|---|---|
| `backend/src/modules/tasks/` | TaskError, Validierung, Migration, Repository, Service, Router, gemeinsame Modulfabrik |
| `frontend/src/features/tasks/` | Aufgabenliste, Formular, Dialog, Gruppenladen, API-Anschluss, Formularmodell, Styles |
| `backend/tests/tasks/` | echte SQLite-/HTTP-Tests, Formular-/Clienttests, Auth-Anschlussprüfung, Browserprüfung, lokale Test-App |
| `frontend/tests/tasks/` | isolierte Testseite; nicht die gemeinsame App |
| `docs/spec/tasks.md` | Aufgaben-Spec mit F2/D1/D2 und Akzeptanzkriterien |
| `docs/arch/tasks.md` | arc42-Modulbeschreibung, Zuordnung zu Code, Laufzeitdiagramm |
| `docs/adr/tasks-persistence.md` | konkrete Persistenzentscheidung mit Alternativen und Nachteilen |
| `docs/tasks-verification.md` | tatsächlich ausgeführte Prüfungen und offene Punkte |
| `docs/tasks-walkthrough.md` | Lern- und Erklärungshilfe für Amin |
| `docs/tasks-installation.md` | vollständiger lokaler Start mit echten Teammodulen |
| `docs/tasks-readiness.md` | Auftragsmatrix, feste Schnittstellen und verbleibende Teamaufgaben |

## 3. Branch abrufen oder Paket lokal übernehmen

Die Teammitglieder können den veröffentlichten Branch in einem sauberen Checkout
abrufen. Bereits vorhandene lokale Änderungen zuerst sichern:

```bash
git fetch origin
git switch --track origin/work/amin-tasks
```

Existiert der lokale Branch schon, stattdessen `git switch work/amin-tasks` und
anschließend `git pull --ff-only origin work/amin-tasks`. Damit wird `main` nicht
zusammengeführt oder geändert. Die Installation folgt unter Abschnitt 4 bzw.
[Installation](tasks-installation.md). Nach dem Branch-Checkout den ZIP-Patch nicht
zusätzlich anwenden, denn er enthält dieselben neuen Dateien.

**Alternative für die ZIP-Übergabe:**

Das Übergabe-ZIP enthält unter `files/` nur die neuen Repository-Dateien sowie
`amin-tasks.patch`. Im eigenen sauberen Checkout zunächst den Patch prüfen:

```bash
git status --short
git apply --check /PFAD/ZUM/PAKET/amin-tasks.patch
git apply /PFAD/ZUM/PAKET/amin-tasks.patch
```

`/PFAD/ZUM/PAKET/` durch den eigenen entpackten Ort ersetzen. Alternativ die Dateien
aus `files/` entsprechend ihrer Verzeichnisse kopieren. Vorhandene gleichnamige Dateien
nicht überschreiben; der Patch-Check verhindert das. Die Patchübernahme erstellt
keine Commits und führt keinen Push durch. Für spätere eigene Änderungen die
konsistente eigene Git-Identität und Conventional Commits verwenden.

Die Veröffentlichung gliedert sich in vier nachvollziehbare Commit-Themen:
Backend/API/Persistenz mit Tests; Frontend und Formularprüfungen; Anschlusstests mit
echten Teammodulen; Spezifikation, Architektur, ADR und Übergabe. Die Nachrichten
beschreiben die tatsächlich enthaltenen Änderungen. KI-Unterstützung und tatsächliche
Prüfungen sind in Spec, Architektur und Prüfprotokoll offengelegt.

## 4. Abhängigkeiten installieren und Modul starten

Node.js 24.19.0 und npm 11.9.0 wurden hier verwendet. Aus dem Repository:

```bash
cd backend
npm ci
cd ../frontend
npm ci
cd ../backend
node --test tests/tasks/*.test.js
node tests/tasks/preview.mjs
```

Dann `http://127.0.0.1:5174` öffnen. Strg+C beendet die Testansicht.
Sie verwendet erfundene Konten und Test-Gruppenrechte; ihre Daten liegen temporär
in SQLite und bleiben beim Browser-Neuladen erhalten, werden aber bei regulärem
Beenden entfernt. Sie prüft Amins Paket ohne Änderungen an `server.js`/`App.jsx`.
Sie ersetzt weder echte Auth-/Gruppenintegration noch die finale Anwendung.

Build der Aufgaben-Testseite, Bash:

```bash
TASK_BUILD_OUT=/tmp/studyprio-tasks-build node tests/tasks/preview.mjs --build
```

PowerShell-Variante:

```powershell
$env:TASK_BUILD_OUT = "$env:TEMP/studyprio-tasks-build"
node tests/tasks/preview.mjs --build
```

Der Ausgabeordner ist nur für den Testbuild vorgesehen und wird geleert. Diesen
Wert nie auf einen Arbeits-/Quellcodeordner setzen.

## 5. Backend mit den anderen verbinden

Ahshan/Jaouad übernehmen die folgenden Montageschritte im gemeinsamen Start. Keine
zweite API und keine zweite Datenbank anlegen.

**Migration:** Jaouads `users` zuerst, Haizams echte `groups` danach, dann
`taskMigration.up(db)`, danach Ahshans `commentMigration.up(db)`.
Auf derselben Verbindung muss vorher `PRAGMA foreign_keys = ON` gesetzt sein.
Die Task-Migration legt keine fremden Tabellen an. Bereits bestehende verwaiste
Kommentare vorab mit dem Team klären; anschließend `PRAGMA foreign_key_check` prüfen.

**Task-Router:** im gemeinsamen `createApp` vor dem `/api`-404-Handler montieren.
Nicht nachträglich an dessen zurückgegebene App anhängen, weil die Anfrage sonst
bereits vom vorhandenen 404-Handler beendet wird.

```js
import { createTaskModule } from './modules/tasks/taskModule.js';

const { taskService, taskRouter } = createTaskModule({
  openDb, requireAuth,
  accessService // Haizams echte, asynchrone Rechteprüfung
});
app.use('/api/tasks', taskRouter);
```

`requireAuth` muss Jaouads echte Sitzung prüfen. Der globale `protectWrites`- und
JSON-Middleware-Abschnitt seines Branches bleibt davor. Sein allgemeiner Fehlerhandler
bleibt danach. TaskRouter übernimmt eigene `TaskError`; fremde AuthError werden weitergereicht.
`taskService` aus dem gemeinsamen Aufbau an Dashboard/Details weiterreichen.

**AccessService:** Alle folgenden Prüfmethoden sind asynchron. Für Amins Modul
werden `canReadTask(userId, task)`, `canWriteTask(userId, task)` und
`isGroupMember(userId, groupId)` benötigt. Haizams `isGroupOwner` bleibt dessen eigene
Schnittstelle. Der Parameter von canRead/canWrite ist das Task-Objekt, keine ID.
Die Methoden müssen aktuell lesen, boolesche Werte liefern und dürfen innerhalb
der Prüfung nicht in die gemeinsame DB schreiben. Amins Schreibtransaktion hält
zu diesem Zeitpunkt bereits eine SQLite-Schreibreservierung.

**Gruppenlöschung:** Task-FK nach `groups` ist vorläufig `RESTRICT`. Gruppen mit Tasks
können somit nicht einfach gelöscht werden. Haizam muss diesen Fall vor Gesamtintegration
mit dem Team behandeln. Nicht still auf CASCADE umstellen, ohne die fachliche Regel zu klären.

## 6. Frontend verbinden

In Jaouads bestehender App wird hinter AuthGate das Aufgabenmodul eingesetzt:

```jsx
import AuthGate from './features/auth/AuthGate.jsx';
import TasksWorkspace from './features/tasks/TasksWorkspace.jsx';
import { api } from './api.js';

<AuthGate><TasksWorkspace api={api} /></AuthGate>
```

`TasksWorkspace` lädt die echten Gruppen automatisch und aktualisiert sie auch nach
Rechtefehlern. Erst wenn Ahshans Detailansicht verfügbar ist, wird zusätzlich
`onSelectTask={openTaskDetails}` übergeben. Alternativ kann die Team-App `TasksPage`
direkt mit einer selbst verwalteten aktuellen Gruppenliste verwenden.
Gruppen-/Sitzungsprüfungen bleiben auf dem Server verbindlich.

Jaouads Client ist aktuell `api(path,{method,body})`, nicht `api.get(...)`. Amins
`createTaskApi` unterstützt beide Formen, ohne Jaouads Datei zu ändern. DELETE sendet
`{}` als JSON, weil sein `protectWrites` sonst 415 liefert. Sein Client reicht bislang
keine strukturierten `fields/code` aus Fehlern durch; die UI zeigt eigene Feldprüfung
und serverseitige Fehlermeldung. Eine Erweiterung dieses gemeinsamen Clients ist bei
Jaouad abzustimmen, nicht Voraussetzung für grundlegendes CRUD.

## 7. Anschluss an Kommentare und Priorisierung

**Ahshan:** `taskService.getVisibleById(userId, taskId)` liefert ein geprüftes Task-
Objekt. Sein derzeitiger Kommentarrouter ruft AccessService synchron mit einer ID
auf. Das passt nicht zum gemeinsamen asynchronen Task-Objekt-Vertrag. Bei Integration
muss er auf `await` und Task-Objekt umgestellt werden; andernfalls könnte ein Promise
wie eine Freigabe behandelt werden. Außerdem hat Jaouads App derzeit einen 503-
Platzhalter für Kommentare, der erst nach dieser Rechteintegration ersetzt wird.
Die echte SQL-Kommentar-Kaskade ist bereits mit Ahshans unverändertem Schema geprüft.
Seine Kommentaroberfläche muss außerdem Jaouads API-Client nutzen; ihrem aktuellen
POST-Fetch fehlt der erforderliche `X-StudyPrio-Request`-Header.

**Bassim:** `listVisible(userId)` und `getVisibleById(userId,id)` statt direktem
ungeprüftem Datenbankzugriff verwenden. `dueAt` ist UTC, Wichtigkeit/Schwierigkeit
liegen in 1–5, Aufwand in Stunden. Amins Liste berechnet keinen Score. TaskError mit
Status/Code auch in den Consumer-Routen ordentlich übersetzen.

## 8. Zusätzliche Prüfungen ausführen

Echte Auth-Anschlussprüfung (separater Checkout mit Jaouads Dateien nötig):

```bash
TASK_AUTH_ROOT=/PFAD/ZUM/AUTH-CHECKOUT node --test tests/tasks/auth.integration.mjs
```

Nach Zusammenführung kann die Variable auf das eigene Projektverzeichnis zeigen.
Der referenzierte Checkout benötigt seine Backend-Abhängigkeiten. Windows:
`$env:TASK_AUTH_ROOT = 'C:/Pfad/zum/Projekt'`, danach denselben Node-Befehl ausführen.
Der Test benutzt echte Auth-Module, aber Test-Mailtransport und Test-Gruppenrechte.

Browserprüfung nutzt Playwright als separates Prüfwerkzeug, keine Produktionsabhängigkeit.
Es muss für den Test verfügbar sein; `PLAYWRIGHT_MODULE` kann auf dessen `index.mjs`
zeigen. Mit installiertem Chromium startet folgender Befehl auch die lokale Testansicht:

```bash
node tests/tasks/browser.integration.mjs --start-preview
```

Optional `TASK_CHROMIUM` auf eine vorhandene Chromium-Datei und `TASK_SCREENSHOTS`
auf einen eigenen Ausgabeordner setzen. Der Prüfungsbrowser darf nur localhost aufrufen.
Die Testansicht muss für `--start-preview` auf Port 5174 frei starten können.

## 9. Vor der gemeinsamen Abgabe offen

1. Amin prüft/erklärt den Code; [Walkthrough](tasks-walkthrough.md) durcharbeiten.
2. Den erfolgreich geprüften Gruppen-/Aufgabenanschluss in den gemeinsamen Start
   übernehmen. Dort Rechtefälle erneut prüfen und die Gruppen-Löschregel abstimmen.
3. Ahshan/Jaouad übernehmen Migration/Router und UI in den gemeinsamen Start;
   Kommentare mit asynchronen Rechten verbinden. AuthGate und Aufgabenansicht wurden
   inzwischen gemeinsam auf Desktop/Mobil geprüft; gemeinsamer Root-Start bleibt offen.
4. Bassim bindet Dashboard/Priorisierung an rechteprüfende Task-Services an.
5. Spec, Architektur, ADRs und INSTALL zu vollständigen Teamdokumenten zusammenführen.
   Amins ADR allein erfüllt nicht die Gesamtanforderung von 3–5 wesentlichen ADRs.
6. Nach Teamprüfung Änderungen mit echten Identitäten und normalen Zeitstempeln in
   `main` zusammenführen. Projektleitung setzt/pusht den annotated M3-Tag auf dem
   finalen Default-Branch-Commit und versendet die geforderte Mail vor der Deadline.

Diese Schritte sind nicht als bereits ausgeführt dokumentiert. Das ZIP ist ein
Übergabepaket, keine kurskonforme finale Abgabe.
