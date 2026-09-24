# Amins Aufgabenbereich – Abschluss und Integrationsvertrag

Stand: 24.09.2026. Die zehn beauftragten Funktionspunkte sind implementiert und
im angegebenen Prüfaufbau getestet. Im geprüften Umfang ist keine weitere
CRUD-Funktion in Amins Bereich offen. Das ist eine technische Prüfung, keine
vorweggenommene persönliche Abnahme durch Amin und keine Freigabe der gesamten App.

Die Remote-Branches wurden erneut abgerufen: `main` bei `7b45b5d`,
`work/jaouad-auth` bei `b8367b3`, `work/haizam-groups` bei `78c78b3`.
Vollständige SHAs: [Team-Integration](tasks-team-integration.md).
Amins Änderungen liegen auf `work/amin-tasks`. Commit und Push dieses Branches
wurden von Amin am 24.09.2026 beauftragt. Abrufen: [Übergabe](tasks-handoff.md).
Der Commit von `main` und bestehende Teamdateien wurden nicht verändert.

## Vollständigkeit des Auftrags

| Anforderung | Umsetzung | Tatsächlicher Nachweis |
|---|---|---|
| 1. Liste, Formular, Bearbeitungsdialog | `TasksPage`, `TaskForm`, `TaskDialog`, `TasksWorkspace` | Browser: echte Anmeldung, Formular, Dialog, Desktop/Mobil |
| 2. Sichtbare Aufgaben und Statusfilter | `listVisible`; HTTP-Statusfilter, UI-Filter | SQLite-/HTTP-Tests, Browserfilter |
| 3. Einzelabruf mit Rechten | `getVisibleById`, `GET /api/tasks/:id` | persönlich/fremd, Mitglied/Nichtmitglied, entfernte Ersteller |
| 4. Anlegen, Gruppe nur als Mitglied | `create`, POST, Gruppenauswahl | echte Gruppen-API und Rechteentzug während Neuanlage |
| 5. Fachfelder/Status ändern, Zuordnung fest | `update`, PATCH nur geänderter Felder | verbotene Felder, offene/erledigte Aufgaben, Wiederöffnen, parallele PATCHes |
| 6. Löschen mit Bestätigung | `remove`, DELETE mit JSON-Body `{}` | Löschabbruch/-bestätigung und echte Auth-/CSRF-Anbindung |
| 7. Server- und UI-Validierung | `taskValidation`, `taskFormModel` | Typen, Grenzen, unmögliche Kalenderdaten, Pflichtfelder, Fehlerfeedback |
| 8. Dauerhafte Speicherung und Fehler | Repository mit SQLite-Datei und Transaktionen | neue Serviceinstanz liest Daten; Browser-Neuladen; fehlgeschlagene Speicherung behält Eingaben |
| 9. Statuswechsel/erledigte Aufgaben | drei Statuswerte und lokale Filter | Status-PATCH, done-Filter, Wechsel done → open |
| 10. Migration/FKs/Datenkonsistenz | `taskMigration`, FK je Verbindung | wiederholbare Migration, ungültige Referenzen, echte Kommentar-Löschkaskade |

Zusätzlich abgeschlossen: beide vereinbarten Lese-Services für Bassim/Ahshan,
Siedersleben-Spec, arc42-Modularchitektur A01–A09/A12, Datenhaltungs-ADR,
[Installation](tasks-installation.md), [Prüfprotokoll](tasks-verification.md) und
[Walkthrough](tasks-walkthrough.md). Neue produktive Abhängigkeiten: keine.

## Feste Anschlüsse an die anderen Beiträge

| Teammitglied | Eingang in Amins Modul | Ausgang aus Amins Modul / Übernahmeschritt |
|---|---|---|
| Jaouad | `requireAuth` setzt `req.user.id`; Funktionsclient `api(path,{method,body})`; `users`-Tabelle | Router vor API-404 montieren, hinter AuthGate `TasksWorkspace api={api}` rendern; echte Sitzungen und Schreibschutz beibehalten |
| Haizam | `groups`, `group_members`, `GET /api/groups`; asynchrone `isGroupMember/canReadTask/canWriteTask` | Task-Objekt an Rechtefunktionen; AccessService mit eigener Leseverbindung derselben DB; keine zweite Gruppenverwaltung |
| Bassim | Noch kein veröffentlichter Dashboard-/Priorisierungs-Code | dieselbe TaskService-Instanz verwenden: `await listVisible(userId)`; keine eigene Sichtbarkeitsumgehung oder zweite Prioritätsformel in Amins Modul |
| Ahshan | echtes `comments.taskId → tasks.id ON DELETE CASCADE` | `await getVisibleById(userId,id)` für Details; optionales UI-Callback `onSelectTask(id)`; Kommentarrouter und -client beim Teamanschluss korrigieren |

Die vollständige Task enthält genau: `id,title,description,dueAt,importance,
difficulty,effortHours,status,ownerId,groupId,createdAt,updatedAt`.
`dueAt/createdAt/updatedAt` sind UTC-ISO-Strings; `groupId=null` bedeutet persönlich.
Zahlen sind JSON-Zahlen; Aufwand in Stunden. Genau diese Daten verwendet die Spec.

Service-Fehler sind verworfene Promises mit `TaskError.status`, `.code`, `.message`
und optional `.fields`. Consumer müssen sie wie die Task-Routen in das vereinbarte
Fehlerformat übersetzen. Ein bloßes `try/catch` ohne `await` fängt sie nicht ab.

## Bekannte Aufgaben der späteren Team-Integration

Die folgenden Punkte liegen außerhalb Amins abgeschlossener CRUD-Implementierung.
Ein bloßes Zusammenführen der Dateien reicht für die vollständige App noch nicht:

1. Gemeinsame Migrationen/Router/Frontend gemäß [Montageanleitung](tasks-team-integration.md)
   verdrahten; eine SQLite-Datei verwenden; `taskService` an Consumer weiterreichen.
2. Ahshans Router wartet Rechteprüfungen bisher nicht ab und übergibt eine ID statt
   der Task. Seine `CommentSection` verwendet außerdem rohe POST-Fetches ohne Jaouads
   `X-StudyPrio-Request`-Header. Beides muss im Kommentarbereich korrigiert werden;
   bevorzugt dessen Frontend an den gemeinsamen API-Client anschließen. Den 503-
   Kommentarplatzhalter erst nach dieser Korrektur ersetzen.
3. Bassims noch nicht veröffentlichtes Modul anschließen und gegen dieselben Rechte-
   und Datenverträge prüfen. Eine Prüfung dieses fehlenden Codes ist nicht behauptet.
4. Gemeinsamen Start, echte SMTP-Konfiguration und parallele Gruppenänderungen prüfen.
   Der Aufgabenanschluss mit den derzeit verfügbaren echten Teammodulen ist getestet.
5. Teamdokumente zusammenführen, menschliche Prüfung durchführen und anschließend
   die kurskonforme Abgabe über den finalen Default-Branch-Commit und annotated Tag
   erledigen. Das Paket nimmt diese gemeinsamen Schritte nicht vorweg.

Bei Änderungen an Team-Branches nach den angegebenen SHAs sind die Anschlusstests
mit den neuen Ständen erneut auszuführen. Kein unbelegtes Versprechen über künftigen Code.

## Abschlusskorrekturen dieser Prüfung

- Nach verlorenem Gruppenrecht bleibt eine offene Neuanlage eindeutig als ungültig
  markiert. Eine inzwischen fehlende Gruppenoption wird nicht scheinbar als
  „Persönliche Aufgabe“ angezeigt. Der Nutzer wählt die neue Zuordnung ausdrücklich.
- Nach erfolgreicher Neuanlage wechselt der Statusfilter auf „Alle Aufgaben“, damit
  die neue offene Aufgabe auch bei vorherigem done-Filter sichtbar bleibt.
- Der echte Team-Browsertest prüft zusätzlich Gruppenladefehler, Wiederherstellung,
  Gruppenentzug während Neuanlage und den ausdrücklichen Wechsel zu persönlich.

KI-Unterstützung: ChatGPT/Codex am 24.09.2026 für Abschlussprüfung, Korrekturen,
Dokumentation und automatisierte Prüfung. Ergebnisse siehe Prüfprotokoll.
