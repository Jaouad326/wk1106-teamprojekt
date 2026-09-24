# StudyPrio gemeinsam testen

Für die Besprechung läuft eine Instanz auf Jaouads Rechner. Ein Cloudflare Quick Tunnel macht sie über eine vorübergehende HTTPS-Adresse erreichbar. Alle öffnen diese Adresse; Oberfläche, API und SQLite-Datenbank gehören dann zusammen. Der Rechner und beide Terminals müssen laufen. Dies ist kein dauerhaftes Hosting und kein Abgabe-Deployment.

## Vorbereitung unter Windows

Die SMTP-Anmeldung muss bereits lokal funktionieren. Die vorhandene SMTP-Datenbank und die Zugangsdaten in `backend/.env` bleiben bestehen. Keine Zugangsdaten oder Datenbankdateien committen. Der aktuelle Stand enthält die Anmeldung; weitere Teamfunktionen müssen noch integriert werden.

1. Laufendes `npm run dev` mit Strg+C beenden.
2. Projekt öffnen und den bereitgestellten Arbeitsbranch holen. Die Befehle einzeln ausführen. Bei eigenen Änderungen oder einem Git-Fehler anhalten, nichts überschreiben:

```powershell
cd C:\Users\ajaou\StudyPrio\wk1106-teamprojekt
git fetch origin
git switch work/jaouad-shared-test
git pull --ff-only
npm.cmd run build
```

Die bisherigen installierten Abhängigkeiten reichen; es kommen keine neuen hinzu.

3. `cloudflared` von der offiziellen Downloadseite installieren: https://developers.cloudflare.com/tunnel/downloads/ (Windows, 64-bit auf einem üblichen x64-PC). Danach ein neues Terminal öffnen. Alternativ ist die Installation über Windows Package Manager möglich:

```powershell
winget install --id Cloudflare.cloudflared --exact
```

4. Im neuen Terminal den Tunnel starten:

```powershell
cloudflared tunnel --url http://127.0.0.1:3000
```

Dieses Terminal offen lassen. Die ausgegebene Adresse `https://....trycloudflare.com` kopieren. Solange das Backend noch nicht läuft, kann der Tunnel einen Verbindungsfehler melden.

5. In `backend/.env` nur diese Werte anpassen bzw. ergänzen:

```dotenv
APP_ORIGIN=https://DEINE-TUNNEL-ADRESSE.trycloudflare.com
SERVE_FRONTEND=true
HOST=127.0.0.1
PORT=3000
```

`APP_ORIGIN` muss genau die echte ausgegebene HTTPS-Adresse sein, ohne Pfad. `MAIL_MODE=smtp`, SMTP-Zugangsdaten, erlaubte Maildomains und die bisherige `DATABASE_PATH` beibehalten. Das Beispiel nicht wörtlich übernehmen. Die Domain von Bassims Hochschuladresse muss ausdrücklich erlaubt sein.

6. Im Projekt-Terminal starten:

```powershell
cd C:\Users\ajaou\StudyPrio\wk1106-teamprojekt
npm.cmd start
```

7. Zuerst selbst die HTTPS-Adresse öffnen, dann dieselbe Adresse an die Gruppe geben. Jeder fordert dort seinen eigenen frischen Anmeldelink an und öffnet ihn selbst. Alte localhost-Links funktionieren dafür nicht. Der Quick Tunnel ist öffentlich erreichbar; die Anmeldung beschränkt weiterhin den Zugriff auf erlaubte Maildomains. Die Adresse nur im Team verteilen.

## Gemeinsam prüfen

- `/api/health` unter der gemeinsamen Adresse meldet `ok` und `connected`.
- Bassim öffnet die gemeinsame Adresse, fordert einen Link an und erhält eine Mail mit genau dieser HTTPS-Adresse.
- Bestätigen meldet ihn an; Neuladen erhält die Sitzung; Abmelden beendet sie.
- Jaouad und Bassim können gleichzeitig mit verschiedenen Konten angemeldet sein.
- Ein bereits bestätigter Link wird abgelehnt.

Noch nicht durchgeführt: der echte Test über den Tunnel auf Jaouads Windows-Rechner. Automatisiert geprüft werden die Auslieferung des Builds und der Loginseite, API-Fallback, Schutz privater Dateien und die vorhandenen Auth-Tests.

## Grenzen und Rückkehr zum lokalen Entwickeln

Bei Neustart des Quick Tunnels gibt es eine neue Adresse: `APP_ORIGIN` ändern, Backend neu starten, neue Links anfordern und neue Adresse teilen. Keine Datenbank löschen. Bei Änderungen an der Oberfläche `npm.cmd run build` erneut ausführen.

Die bisherigen IP-Limits bleiben vorsichtig unverändert: Hinter dem Tunnel teilen sich die Teilnehmer 30 Link-Anfragen und 30 Bestätigungsversuche je 15 Minuten; zusätzlich gilt das Limit je E-Mail. Für fünf Teilnehmer reicht das bei normalem Testen. Bei 429 warten, nicht den Schutz abschalten. Kein pauschales `trust proxy=true` setzen.

Nach dem Test beide Prozesse mit Strg+C stoppen. Für lokale Entwicklung `APP_ORIGIN=http://localhost:5173` und `SERVE_FRONTEND=false` setzen, dann im Projektordner `npm.cmd run dev`. Das SMTP-Passwort bleibt lokal.

Quelle zu Quick Tunnels und ihren Grenzen: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/

Vorbereitung von Code, Anleitung und Tests mit Codex; lokaler automatisierter Test separat vom noch ausstehenden gemeinsamen Test dokumentiert.
