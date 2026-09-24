# Anmeldung – Übergabe für die Besprechung am 24.09.

## Was bereit ist
Login per Einmal-Link, SQLite-Sitzung, Logout, requireAuth, Nutzerverzeichnis,
Login-Oberfläche, API-Client und Nutzerkontext. 29 Auth-/Clienttests und zwei
Team-Tests bestanden. Der Browserablauf mit echten Aufgaben-/Gruppenmodulen
ist auf Desktop und Mobil geprüft. Mailtransport ist im Prüfaufbau simuliert.

## Stand der Teamteile im geprüften Aufbau

| Teil | Verwendeter Stand | Anschluss |
|---|---|---|
| Anmeldung / Jaouad | aktueller Auth-Arbeitsstand vom 24.09. | createApp, requireAuth, userDirectory, AuthGate, useAuth |
| Aufgaben / Amin | work/amin-tasks, a552cdb | createTaskModule und TasksWorkspace geprüft |
| Gruppen / Haizam | work/haizam-groups, 78c78b3 | Gruppen-API und AccessService geprüft |
| Kommentare / Ahshan | main, 7b45b5d | Schema vorhanden; Router/UI noch anzuschließen |
| Priorisierung / Bassim | beim Abruf noch kein veröffentlichter Branch vorhanden | später taskService aus features verwenden |

Die Tests vereinigen die Module lokal. main und die Arbeitsbranches der anderen
werden dabei nicht verändert. Der normale npm-run-dev-Start zeigt noch die
Auth-Willkommensansicht. Die folgende Demo zeigt bereits Aufgaben und Gruppen.

## In der Besprechung starten

Voraussetzung: Node.js wie in INSTALL.md und npm ci in Root, Backend, Frontend.

```sh
git fetch origin
npm run test:team
npm run demo:team
```

http://localhost:5175 öffnen. Adresse: demo@campus.example.
„Anmeldelink anfordern“ drücken, den URL-Wert aus TEST_LOGIN_LINK im Terminal
öffnen und bestätigen. Eine Demo-Gruppe und Aufgabe sind vorbereitet.
Neue Aufgabe anlegen, Seite neu laden und abmelden. Strg+C beendet den Aufbau.
Die Daten sind erfunden und temporär; keine echten E-Mails, keine dauerhaften
Gruppen-/Aufgabendaten. Die separate Gruppenoberfläche gehört nicht zu dieser Demo.

Der Runner erstellt temporäre detached Worktrees der oben genannten Commits,
verwendet die installierten Abhängigkeiten und entfernt die Worktrees beim Beenden.
Bei Änderungen der Team-Branches müssen die Prüfstände im Runner bewusst aktualisiert
und erneut getestet werden. Keine Änderungen an fremden Arbeitsdateien übernehmen,
ohne deren aktuellen Stand abzugleichen.

## Montage in der gemeinsamen App

Nach Zusammenführung der Module: Migrationen in der Reihenfolge Auth → Gruppen →
Aufgaben → Kommentare. Dieselbe SQLite-Datei verwenden, Fremdschlüssel aktivieren.
PRAGMA foreign_key_check muss anschließend leer sein. Alte verwaiste Daten
gemeinsam prüfen; keine automatische Löschung.

createApp nimmt den synchronen Callback mountFeatures entgegen. Darin werden
Routen vor dem 404-Handler montiert. Die Vorlage steht lauffähig in
backend/tests/integration/teamFixture.mjs. Auszug:

```js
mountFeatures(app, { openDb, requireAuth, userDirectory }) {
  // groupService und accessService zuvor mit echten Verbindungen aufbauen.
  const { taskRouter, taskService } = createTaskModule({
    openDb, requireAuth, accessService
  });
  app.use('/api/groups', createGroupRouter(groupService, requireAuth));
  app.use('/api/tasks', taskRouter);
  return { taskService, groupService };
}
```

taskService ist dann über runtime.features.taskService verfügbar. Neue Routen
nicht erst nach Rückgabe der App-Fabrik anhängen: Dort ist der 404-Handler schon
registriert. Gruppen-Schreibvorgänge brauchen eigene Verbindungen je Aufruf;
ein gemeinsam verwendeter Handle kann parallele Transaktionen vermischen.
Der geprüfte Adapter in teamFixture.mjs öffnet/schließt je Gruppenaufruf eine
Verbindung. Der AccessService verwendet eine eigene reine Leseverbindung.
Dauerhafte Handles beim Serverende schließen.

Frontend nach Zusammenführung:

```jsx
<AuthGate><TasksWorkspace api={api} /></AuthGate>
```

Weitere Ansichten erhalten über useAuth() das Objekt { user, logout }.
user enthält id, email, emailVerifiedAt und createdAt. API-Aufrufe erfolgen
über api('/tasks', { method: 'POST', body: ... }); die Funktion liefert data.
Fehler enthalten status, code und gegebenenfalls fields für die Formularfelder.
Bei 401 aus geschützten Modulen blendet AuthGate die Ansicht aus und zeigt den Login.
Dies ersetzt keine serverseitige Prüfung: Alle geschützten Routen nutzen requireAuth.

## Noch gemeinsam zu erledigen

- SMTP-Versandkonto einrichten. mnd.thm.de ist anhand der Kursmails belegt;
  weitere Empfängerdomains bei Bedarf ergänzen. Mailkonto ist der Absender,
  die Hochschuladresse ist der Empfänger; es werden keine Uni-Passwörter abgefragt.
- Für SMTP neue DATABASE_PATH und Migration verwenden. Lokale Testkonten dürfen
  nicht übernommen werden; der Server blockiert den Moduswechsel auf derselben DB.
- npm run mail:check prüft Verbindung/Anmeldung ohne Versand. Danach tatsächliche
  Zustellung eines selbst angeforderten Links prüfen.
- Ahshans Kommentare: Task über taskService laden, Rechte mit await und Taskobjekt
  prüfen; Frontend-POST über api() senden. Kommentare sind bis dahin gesperrt.
- Haizams übrige Fehlerfälle und Gruppenoberfläche prüfen. Sein aktueller Router
  gibt bei unbekannten Fehlern interne error.message zurück; das vor Freigabe ändern.
- Bassims Priorisierung/Dashboard anschließen, finalen Build und Gesamtablauf prüfen.
- Gemeinsame Spec/Architektur vervollständigen und Review durch alle. Kein bestandener
  Gesamtabnahmetest und kein Produktionsbetrieb wird hier behauptet.

## Browserprüfung wiederholen (optional)

Mit separat installiertem Playwright samt Chromium:
node backend/tests/integration/run.mjs --browser.
PLAYWRIGHT_MODULE kann auf die Playwright-Moduldatei zeigen, STUDYPRIO_CHROMIUM auf
eine vorhandene Browserdatei. Browsertools sind keine Produktivabhängigkeiten.
Geprüft am 24.09. mit Chromium 131: explizite Linkbestätigung, Nutzerkontext,
Gruppenliste, Neuanlage, Reload, Sitzungsende, erneuter Login, Logout und ungültiger
Link. Screenshots wurden auf Desktop 1280×950 und Mobil 390×844 kontrolliert.

KI-Unterstützung: ChatGPT/Codex für Anschlusskorrekturen, Prüfhilfen und Dokumentation.
Jaouads persönliche Codeprüfung und Erklärung sowie die gemeinsame Abnahme stehen aus.
