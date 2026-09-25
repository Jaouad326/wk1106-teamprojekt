# Gemeinsamer Stand – 25.09.2026

## Welche Dateien zusammengehören

Alle Module werden aus demselben Checkout gestartet. Keine alten Branches oder
Dateien darüberkopieren. Basis dieser Korrektur ist main, Commit a362c80.

| Bereich | Dateien / Anschluss |
|---|---|
| Login-Oberfläche | frontend/src/features/auth/AuthGate.jsx und auth.css |
| Dashboard | frontend/src/features/dashboard/DashboardPage.jsx und dashboard.css |
| Aufgaben | frontend/src/features/tasks/TasksPage.jsx; backend/src/modules/tasks |
| Gruppen | frontend/src/features/groups; backend/src/modules/groups |
| Kommentare | frontend/src/features/comments; backend/src/modules/comments |
| Gemeinsamer API-Client | frontend/src/api.js |
| Zusammensetzung | frontend/src/App.jsx und backend/src/app.js |

Bassim kann die Login-Oberfläche in AuthGate.jsx und auth.css gestalten.
Die Loginlogik bleibt mit dem Backend verbunden: Link anfordern, ausdrücklich
bestätigen, Sitzung laden, abmelden. Es ist kein eigener zweiter Login nötig.
Das Dashboard wird nach erfolgreicher Anmeldung außerhalb des Loginlayouts angezeigt.

createApp registriert Gruppen-, Aufgaben- und Kommentarrouten bereits selbst.
Diese Routen nicht nochmals mit mountFeatures einhängen. Der Hook ist nur für
zusätzliche Routen vorgesehen. Alle geschützten Module verwenden requireAuth
und dieselbe SQLite-Datenbank. Kommentare prüfen den Zugriff über taskService.
Gruppenmitglieder müssen sich einmal anmelden, bevor der Gruppenbesitzer ihre
bestätigte E-Mail-Adresse hinzufügen kann.

Frontendaufrufe über api('/tasks', ...) verwenden. Die Funktion setzt JSON und
X-StudyPrio-Request, liefert data und behandelt abgelaufene Sitzungen gemeinsam.
Keinen fremden Backendhost und keine eigenen CORS-Ausnahmen einbauen.

## Warum eine UI-Änderung online fehlen kann

GitHub, der Checkout auf dem Server und die ausgelieferten Webdateien sind drei
verschiedene Stände. Ein Push allein baut die Website nicht neu. Zu prüfen sind:

1. Ist die Änderung im Branch, den die VM tatsächlich verwendet?
2. Läuft der Dienst aus genau diesem Projektordner?
3. Wurde frontend/dist nach dem Update neu gebaut?
4. Liefert der Webserver dieses dist aus oder noch einen anderen Ordner/Devserver?
5. Stimmen Website-Adresse und APP_ORIGIN überein?

Die aktuelle VM-Konfiguration nach den Änderungen mit Copilot ist noch nicht
bekannt. Deshalb werden hier weder ein Dienstname noch ein Serverpfad behauptet.
Vor Änderungen .env und Datenbank sichern; keine reset --hard-/clean-Befehle und
keine Datenbanklöschung verwenden, um einen abweichenden Checkout zu bereinigen.

## Gemeinsamer Serverbetrieb

Die App unterstützt optional eine einzige Backendadresse für UI und API:

- Im Projektordner die Abhängigkeiten von Backend und Frontend mit npm ci installieren.
- Im Projektordner npm run build ausführen.
- In backend/.env SERVE_FRONTEND=true setzen; für öffentlichen Betrieb außerdem
  NODE_ENV=production, MAIL_MODE=smtp, APP_ORIGIN=https://die-tatsaechliche-adresse
  und vollständige SMTP-Konfiguration. APP_ORIGIN enthält keinen Pfad.
- Bei Betrieb hinter einem lokalen HTTPS-Proxy HOST=127.0.0.1 verwenden.
- npm start im Projektordner startet das Backend samt gebauter Oberfläche.
- Der vorhandene Dienst muss diesen Prozess dauerhaft betreiben. Der HTTPS-Proxy
  leitet in dieser Variante alle Pfade an 127.0.0.1:3000 weiter.

Das ist eine unterstützte Konfiguration, keine bereits ausgeführte VM-Änderung.
Ein bestehender separater statischer Webserver kann ebenfalls funktionieren;
dort müssen Buildpfad, /auth/verify und /api korrekt zugeordnet sein.

Bei späteren Updates: gemeinsame Änderungen integrieren, richtigen Commit auf
der VM beziehen, Abhängigkeiten bei Bedarf installieren, neuen Build erstellen,
Datenbank vor nötigen Migrationen sichern und den Backenddienst neu starten.
Den tatsächlichen Dienstnamen und Projektpfad vorher ermitteln.

## Prüfergebnis vom 25.09.2026

45 Backendtests, zwei gemeinsame HTTP-Integrationstests und der Vite-Build
bestanden. Der Browserablauf lief mit Chromium 131 und Zeitzone Europe/Berlin
auf Desktop und Mobil durch: Login, Gruppenanlage, Aufgabenzuordnung,
Terminbearbeitung ohne Verschiebung, Kommentare, Reload, Sitzungsende, erneuter
Login, Logout und Ablehnung eines bereits verwendeten Links. Dies ist eine
lokale Prüfung mit simulierter Mailzustellung, keine Abnahme der Azure-Website.

## Prüfen ohne produktive Daten

Im Projektordner:

```sh
npm --prefix backend test
npm run test:team
npm run build
npm run demo:team
```

Die Demo unter http://localhost:5175 verwendet das echte App.jsx mit allen
aktuellen Modulen. demo@campus.example eingeben und den Link aus TEST_LOGIN_LINK
im Terminal öffnen. Keine echten Mails; neue temporäre Datenbank je Start.
Strg+C beendet die Demo und entfernt nur deren Daten.

Der gemeinsame HTTP-Test prüft auch: Außenstehende können Gruppenaufgaben und
Kommentare nicht lesen; entfernte Mitglieder verlieren diese Rechte; beim
Löschen einer Aufgabe werden ihre Kommentare entfernt.

Optionale Browserprüfung mit separat installiertem Playwright und Chromium:

```sh
node backend/tests/integration/run.mjs --browser
```

PLAYWRIGHT_MODULE kann auf die Playwright-Moduldatei zeigen, STUDYPRIO_CHROMIUM
auf eine Browserdatei. Geprüft werden der Login, neue Gruppen ohne Neuladen,
Aufgaben, Bearbeiten ohne Zeitverschiebung, Kommentare, Reload und Logout.
Der Mailtransport im Test ist simuliert. Die öffentliche Website muss zusätzlich
mit tatsächlicher Mailzustellung und zwei Teamkonten geprüft werden.

KI-Unterstützung: ChatGPT/Codex für Integrationskorrekturen, Tests und diese
Dokumentation. Persönlicher Code-Walkthrough und gemeinsame Abnahme durch das
Team bleiben erforderlich. Automatische Tests ersetzen diese Abnahme nicht.
