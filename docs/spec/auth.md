# UC-01: Anmeldung über Hochschul-E-Mail

Stand: 22.09.2026, erster Zwischenstand. Kein fertiger Login.

## Ziel und Abgrenzung

StudyPrio bestätigt den Zugriff auf eine zugelassene Hochschul-E-Mail-Adresse.
Die Anwendung bekommt kein Uni-Passwort und verwendet keinen THM-SSO.
Mailzugriff beweist nicht automatisch einen aktuellen Studierendenstatus.
Die tatsächlichen zugelassenen THM-Domains müssen vor Integration geprüft werden;
es gibt absichtlich keine geratene produktive Standardliste.

## Normalablauf

1. Nutzer gibt eine Adresse einer konfigurierten Hochschuldomain ein.
2. Backend normalisiert die Adresse (Leerzeichen außen entfernen, Kleinschreibung).
3. Ein zufälliger Link wird gespeichert und über einen Mailadapter versendet.
4. Nutzer bestätigt den Link auf der noch zu implementierenden Bestätigungsseite.
5. Backend verbraucht den Token genau einmal und findet/erstellt das verifizierte Konto.
6. Erst die nächste Lieferung erstellt daraufhin eine Sitzung und zeigt den Login an.

Die Schritte 1–5 sind als Service implementiert, noch nicht als UI-/HTTP-Ablauf.
Der Test-Mailadapter fängt Nachrichten nur im Testprozess ab. Echte Zustellung
ist noch nicht implementiert oder geprüft.

## Regeln und Akzeptanzkriterien

- Nur ausdrücklich konfigurierte Domains; keine automatische Freigabe aller Subdomains.
- ASCII-Mailboxsyntax; leere Eingaben, mehrere @, Zeilenumbrüche und ungültige
  Domain-/Mailboxwerte werden abgewiesen. Keine vollständige RFC-Mailboxunterstützung.
- Link gilt 15 Minuten. Exakt am Ablaufzeitpunkt wird er nicht mehr angenommen.
- Abruf der Mail/GET darf den Link nicht verbrauchen. Später explizite Bestätigung per POST.
- Falsche, abgelaufene und bereits verwendete Tokens erzeugen dieselbe fachliche Fehlermeldung.
- Vor Bestätigung wird kein Benutzerkonto angelegt.
- Weitere Anmeldungen derselben normalisierten Adresse behalten dieselbe Nutzer-ID.
- Zwei konkurrierende Bestätigungen desselben Tokens: höchstens eine erfolgreich.
- Scheitert die Kontoanlage, darf der Token nicht dauerhaft verbraucht sein.
- Scheitert der Mailversand, wird dieser Token widerrufen; kein vorgetäuschter Erfolg.
- Die Anforderungsantwort enthält weder Token noch Aussage, ob ein Konto schon existiert.

## Daten und Schnittstellen

`User`: `id`, `email`, `emailVerifiedAt`, `createdAt` (Strings, UTC-Zeitpunkte als ISO).
`auth_login_tokens`: `tokenHash`, `email`, `createdAt`, `expiresAt`, `usedAt`.
Token-Metadaten und Hash sind ausschließlich intern und dürfen nicht an Clients gehen.

Service: `requestLoginLink(email)`, `verifyLoginToken(token)`,
`findVerifiedByEmail(email)`. Letzteres ist für die spätere berechtigte
Mitgliederverwaltung bestimmt und kein öffentlicher Suchendpunkt.

## Noch offen, nicht als erfüllt bewerten

HTTP-Routen, Login-UI, persistente Sitzungen, Logout, requireAuth, CSRF,
Versand-/Verifikationslimits, Mailprovider, zugelassene Domains und Bereinigung
abgelaufener Tokens. Eigenständige Services nicht direkt ungeschützt veröffentlichen.

## Eingesetzte KI-Werkzeuge

ChatGPT/Codex am 22.09.2026: Entwurf und Implementierung der Service-/Repository-
Schicht sowie automatisierter Tests. Menschliche Codeprüfung und Erklärung durch
Jaouad stehen noch aus. Keine gemeinsame Teamfreigabe oder Produktionsabnahme behauptet.
