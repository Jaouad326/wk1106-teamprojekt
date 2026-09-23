# UC-01: Anmeldung über Hochschul-E-Mail

Stand: 23.09.2026. Login im lokalen Testmodus umgesetzt; echter Mailversand noch nicht abgenommen.

## Ziel
StudyPrio bestätigt den Zugriff auf eine erlaubte Hochschul-E-Mail-Adresse.
Es werden keine Uni-Passwörter abgefragt. Das ist kein offizieller THM-SSO
und kein Nachweis des aktuellen Studierendenstatus.
Im lokalen Testmodus wird auch kein echter Mailboxzugriff nachgewiesen.

## Ablauf
1. Nutzer gibt seine Hochschul-E-Mail ein.
2. Backend prüft die Adresse und erzeugt einen Link mit 15 Minuten Gültigkeit.
3. Im SMTP-Modus geht der Link per Mail raus. Im lokalen Testmodus steht er nur im Backend-Terminal.
4. Nutzer öffnet den Link und klickt auf „Anmeldung bestätigen“. Laden allein verbraucht ihn nicht.
5. Konto und eine neue Sitzung werden gemeinsam gespeichert. Der Link ist danach verbraucht.
6. Die Sitzung bleibt nach Neuladen und Backend-Neustart erhalten, höchstens sieben Tage.
7. „Abmelden“ löscht die Sitzung auf dem Server und das Cookie im Browser.

## Regeln und Fehlerfälle
- Nur ausdrücklich konfigurierte Domains, keine automatische Freigabe von Subdomains.
- Leerzeichen außen entfernen, Kleinschreibung, begrenzte ASCII-Mailboxsyntax.
- Kein Konto vor Bestätigung. Weitere Anmeldungen behalten dieselbe Nutzer-ID.
- Ungültige, abgelaufene und verwendete Links liefern dieselbe Fehlermeldung.
- Zwei gleichzeitige Bestätigungen: höchstens eine erfolgreich.
- Scheitert die Konto- oder Sitzungserstellung, bleibt der Link unverbraucht.
- Scheitert der Versand, wird der Link widerrufen.
- Höchstens drei Linkanforderungen pro Adresse sowie 30 pro IP in 15 Minuten.
  Bestätigungsversuche sind zusätzlich auf 30 pro IP in 15 Minuten begrenzt.
- Abgelaufene oder abgemeldete Sitzungen erlauben keinen Zugriff.
- Die Oberfläche zeigt Ladezustand, Fehler, Versandbestätigung und lokalen Testmodus an.

## Daten
User: id, email, emailVerifiedAt, createdAt.
auth_login_tokens: tokenHash, email, createdAt, expiresAt, usedAt.
auth_sessions: tokenHash, userId, createdAt, expiresAt.
auth_limits: keyHash, hits, expiresAt.

Zeitpunkte sind UTC als ISO-Strings; Ratenlimits verwenden Millisekunden.
Roh-Tokens liegen nicht in der Datenbank. Session-Token werden ausschließlich
im HttpOnly-Cookie übertragen, nicht in der JSON-Antwort.

## Offene Integration
Zugelassene THM-Maildomains müssen anhand der tatsächlich genutzten Teamadressen
festgelegt werden. Die Beispieldomain campus.example ist nur für lokale Tests.
SMTP-Zugang und echte Zustellung sind noch offen. Aufgaben, Gruppen und Kommentare
werden anschließend verbunden. Kommentare liefern bis zur Rechteintegration 503,
ohne Anmeldung 401.

## KI-Nutzung
ChatGPT/Codex am 22.–23.09.2026: Entwurf, Code, Tests und Dokumentation.
Automatisierte Prüfergebnisse stehen in docs/auth-handoff.md.
Menschliche Prüfung und Erklärung durch Jaouad stehen noch aus.
