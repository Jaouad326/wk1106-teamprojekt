# Entscheidung: Sitzungen in SQLite

Datum: 24.09.2026. Status: im Auth-Branch umgesetzt und getestet.

## Kontext

Nach der Linkbestätigung muss der Nutzer angemeldet bleiben. Logout muss die
Sitzung sofort ungültig machen. Ein Backend-Neustart soll niemanden abmelden.
SQLite ist bereits Teil des gemeinsamen Setups.

## Alternativen

- Sitzung nur im Arbeitsspeicher: einfach, aber nach Neustart verloren.
- Signiertes JWT im Browser: Prüfung ohne Datenbank möglich. Sofortiger Widerruf
  würde aber zusätzlich eine Sperrliste oder kurze Laufzeiten mit Erneuerung brauchen.
- Zufälliges Sitzungstoken mit Datenbankeintrag: eine Datenbankabfrage pro
  geschützter Anfrage, dafür einfacher Widerruf.

## Entscheidung und Begründung

Ein zufälliges Token kommt in ein HttpOnly-Cookie. SQLite speichert nur seinen
SHA-256-Hash sowie userId, createdAt und expiresAt. Die Laufzeit beträgt sieben
Tage ohne automatische Verlängerung. Das reicht für den Projektumfang und
ermöglicht Logout durch Löschen genau dieser Sitzung.

Linkverbrauch, Kontoanlage und Sitzungserstellung erfolgen in einer Transaktion.
Scheitert ein Schritt, bleibt der Link verwendbar. Eine neue Anmeldung ersetzt
die Sitzung dieses Browsers; andere Geräte werden dadurch nicht abgemeldet.

## Konsequenzen

Die Datenbank muss bei jeder geschützten Anfrage erreichbar sein. Cookie und
Backend brauchen dieselbe Origin; fremde schreibende Anfragen werden geprüft.
SQLite passt zum einzelnen Backend-Prozess, ist keine Lösung für viele verteilte
Server. Ein gestohlenes gültiges Sitzungstoken ist bis Widerruf/Ablauf verwendbar;
HttpOnly, HTTPS und begrenzte Laufzeit reduzieren dieses Risiko.

Nachweis: sessionService.js, authRepository.js und tests/auth/http.test.js.
