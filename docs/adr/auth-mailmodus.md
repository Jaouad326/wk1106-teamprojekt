# Entscheidung: Lokale Anmeldung getrennt vom echten Mailbetrieb

Datum: 24.09.2026. Status: im Auth-Branch umgesetzt und getestet.

## Kontext

Die Gruppe muss ohne bereits eingerichteten Mailanbieter arbeiten können.
Ein Link im Terminal bestätigt aber keinen Zugriff auf ein Hochschulpostfach.
Solche Konten dürfen nicht unbemerkt als verifiziert in den echten Betrieb gelangen.

## Alternativen

- Entwicklung nur mit echtem Mailkonto: realistischer, aber alle benötigen sofort
  Zugang zum Versandkonto; externe Ausfälle blockieren lokale Arbeit.
- Automatischer Rückfall auf Terminalausgabe bei SMTP-Fehlern: bequem, aber eine
  fehlgeschlagene Mail könnte fälschlich als erfolgreiche Anmeldung wirken.
- Zwei ausdrücklich ausgewählte Modi mit getrennten Datenbanken.

## Entscheidung und Begründung

MAIL_MODE ist entweder local oder smtp. Lokal wird der Link im Terminal ausgegeben
und die Oberfläche zeigt den Testmodus. Dieser Modus bindet nur an 127.0.0.1 und
ist mit öffentlicher APP_ORIGIN oder NODE_ENV=production gesperrt.
SMTP verlangt vollständige Konfiguration und TLS. Bei Fehler gibt es 503;
das gerade erzeugte Linktoken wird gelöscht, kein Rückfall auf Terminalausgabe.

auth_settings hält den Modus der Datenbank fest. Ein Wechsel verlangt einen neuen
DATABASE_PATH. Auch alte Datenbanken mit Konten/Links ohne Moduskennzeichnung
dürfen nicht direkt als SMTP-Datenbank verwendet werden.

## Konsequenzen

Lokale Entwicklung bleibt unabhängig vom Anbieter. Für echten Betrieb werden
Konten per zugestellter Mail neu bestätigt; lokale Aufgaben/Mitgliedschaften
werden nicht automatisch übernommen. Das ist ein bewusster Mehraufwand.
SMTP-Verbindungsprüfung und lokale Transporttests ersetzen keinen Zustelltest
beim tatsächlichen Anbieter. Ein Versandkonto bleibt dafür notwendig.

Nachweis: authConfig.js, server.js, authRepository.ensureMailMode,
tests/auth/http.test.js und tests/mail/smtp.test.js.
