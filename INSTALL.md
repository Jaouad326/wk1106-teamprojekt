# StudyPrio lokal starten

Stand: 24.09.2026, Auth-Beitrag für die gemeinsame Basis auf main.
Jaouad hat den Login mit echter Gmail-Zustellung an sein THM-Postfach auf Windows
erfolgreich geprüft. Die Aufgaben-/Gruppen-Demo ist unten beschrieben;
die endgültige Zusammenführung der übrigen Teamteile steht noch aus.

## Voraussetzungen

Node.js ab 22.9 und npm, Git. Geprüft unter Node.js 24.19.0.
Falls sqlite3 kein fertiges Paket für das Betriebssystem liefert, werden
Python und die C/C++-Buildwerkzeuge der Plattform benötigt.

## Installation

Repository klonen und den gemeinsamen Hauptbranch auswählen:

```sh
git clone https://github.com/Jaouad326/wk1106-teamprojekt.git
cd wk1106-teamprojekt
git switch main
npm ci
cd backend
npm ci
```

backend/.env.example nach backend/.env kopieren (im Dateimanager oder
unter Linux/macOS mit cp .env.example .env; PowerShell: Copy-Item .env.example .env).
Die Beispielkonfiguration ist ausschließlich lokal: campus.example und MAIL_MODE=local.

```sh
npm run migrate
cd ../frontend
npm ci
cd ..
npm run dev
```

Browser: http://localhost:5173 (genau localhost, passend zu APP_ORIGIN).
Backend: http://127.0.0.1:3000/api/health.
Beide Ports müssen frei sein; Vite wechselt nicht automatisch auf einen anderen Port.

## Lokalen Login ausprobieren

1. student@campus.example im Formular eingeben.
2. „Anmeldelink anfordern“ klicken.
3. Den Link aus dem Backend-Terminal im Browser öffnen.
4. „Anmeldung bestätigen“ klicken, Seite neu laden, dann abmelden.
5. Den alten Link erneut verwenden: Er muss abgewiesen werden.

Es wird keine echte Mail verschickt und kein Postfachzugriff bestätigt.
Der lokale Modus darf nicht öffentlich angeboten werden.
Der Link wird nach dem Öffnen aus der Adressleiste entfernt; bei Neuladen der
Bestätigungsseite den ursprünglichen Link aus dem Terminal erneut öffnen.

## Echter Mailversand

In backend/.env MAIL_MODE=smtp setzen sowie SMTP_HOST, SMTP_PORT (587 oder 465),
SMTP_USER, SMTP_PASS und MAIL_FROM mit den Angaben des Versandkontos ausfüllen.
ALLOWED_EMAIL_DOMAINS enthält die tatsächlich verwendeten Hochschuldomains,
durch Kommas getrennt. campus.example vorher entfernen.
Die bereitgestellten Kursmails belegen mnd.thm.de. Weitere Teamdomains bei Bedarf
ausdrücklich ergänzen; keine automatische Freigabe beliebiger Subdomains.
Es werden keine Uni-Passwörter der sich anmeldenden Nutzer benötigt.

.env wird nicht committed. Keine Zugangsdaten in Doku, Chat oder Screenshots teilen.
SMTP erzwingt TLS; der Versandprovider muss den Absender erlauben.
Für SMTP außerdem eine neue DATABASE_PATH wählen, beispielsweise studyprio-mail.sqlite,
und npm run migrate erneut ausführen. Der Server lehnt einen Wechsel des Mailmodus
mit derselben Datenbank ab. Bestehende Testdaten werden dabei nicht gelöscht.
Mit npm run mail:check im Backend lassen sich TLS-Verbindung und Anmeldung prüfen,
ohne eine Mail zu senden. Erst ein anschließend angeforderter und empfangener
Anmeldelink belegt die echte Zustellung.
Der Gmail-Versand wurde am 24.09. von Jaouad erfolgreich mit seinem THM-Postfach
geprüft. Weitere Installationen benötigen ihre eigene lokale Konfiguration.
Es gibt keinen stillen Wechsel von SMTP auf Testlinks.

Bei öffentlichem Betrieb: NODE_ENV=production, APP_ORIGIN als HTTPS-Origin,
HTTPS-Reverse-Proxy für Frontend und /api auf derselben Origin; HOST passend zum
Proxy setzen. Dieser Betrieb ist noch nicht abgenommen.
npm run build im Frontend erstellt nur die Webdateien; das Express-Backend
muss zusätzlich laufen. vite preview ist keine fertige Produktivbereitstellung.

## Prüfen

Im Root: npm run check:auth (Backendtests und Frontend-Build).
Einzeln: im Backend npm test, im Frontend npm run build.
Zusätzlich im Backend: npm run test:mail. Dafür OpenSSL im PATH und die
Entwicklungsabhängigkeiten installieren. Die Tests starten einen lokalen SMTP-Server
mit temporärem Zertifikat; kein Anbieterzugang nötig, keine externen Empfänger.
STARTTLS, direktes TLS und abgewiesene Verbindungen werden damit geprüft.
npm run migrate im Backend ist wiederholbar und löscht keine Nutzer.
SQLite-Datei: backend/studyprio.sqlite; mit DATABASE_PATH anpassbar.
Zum Testen einen separaten Datenbankpfad verwenden, keine Teamdatenbank löschen.

## API für die Integration

| Methode | Pfad | Zweck |
|---|---|---|
| GET | /api/auth/config | Kennzeichnung lokaler Testmodus |
| POST | /api/auth/request-link | JSON {"email":"..."}, 202 bei Erfolg |
| POST | /api/auth/verify | JSON {"token":"..."}, setzt Sitzungscookie |
| GET | /api/auth/me | Aktueller Nutzer oder 401 |
| POST | /api/auth/logout | JSON {}, Sitzung löschen, 204 |
| GET | /api/health | Datenbankverbindung prüfen |

Alle schreibenden Aufrufe benötigen Content-Type: application/json,
X-StudyPrio-Request: 1 und einen Origin passend zu APP_ORIGIN.
frontend/src/api.js setzt die nötigen Header; der Browser setzt Origin selbst.
Cookies bleiben bei Aufrufen über den Vite-Proxy auf derselben Origin.

## Bekannte offene Punkte

Finale Montage der übrigen Module sowie Kommentarrechte sind noch offen.
Aufgaben-/Gruppenanschluss ist im separaten Prüfaufbau getestet.
Bei 429 etwas warten: drei Mailanforderungen pro Adresse/15 Minuten,
30 Anforderungen bzw. Bestätigungsversuche pro IP/15 Minuten.
Ein anderer Browser-Origin führt bei schreibenden Aufrufen zu 403.
Bei Startfehler: .env und Migration prüfen; bei Mailfehler: SMTP-Konfiguration.

## Gemeinsame Demo für die Besprechung

Nach Installation der Abhängigkeiten im Root:

```sh
git fetch origin
npm run test:team
npm run demo:team
```

http://localhost:5175 öffnen, demo@campus.example eingeben und den Link aus
TEST_LOGIN_LINK im Terminal öffnen. Danach erscheinen Amins Aufgabenansicht und
die Gruppenliste. Der Prüfaufbau verwendet die festgehaltenen Team-Commits in
temporären Worktrees und eine neue Testdatenbank. Strg+C räumt beides auf.
Es erfolgen kein Merge und keine GitHub-Schreiboperation. Details und Grenzen:
[docs/auth-integration.md](docs/auth-integration.md).

Abschlussprüfung und Erklärung des Auth-Codes:
[docs/auth-abschluss.md](docs/auth-abschluss.md).

## Gemeinsamer Test über eine HTTPS-Adresse

Für einen Test mit mehreren Rechnern siehe [gemeinsamer-test.md](docs/gemeinsamer-test.md). Mit `SERVE_FRONTEND=true` liefert das Backend den vorher gebauten Frontend-Stand aus. Zugangsdaten und SQLite-Datei bleiben auf dem Rechner, auf dem das Backend läuft.
