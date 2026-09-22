# UC-01: Anmeldung über Hochschul-E-Mail

Stand: 24.09.2026. Login einschließlich Team-Anschluss im lokalen Testmodus geprüft.
Jaouad hat zusätzlich echte Gmail-Zustellung an sein THM-Postfach, Login,
Sitzung nach Neuladen, Logout und Linkwiederverwendung unter Windows geprüft.

## P1/P2: Ziel und Rahmen

StudyPrio bestätigt den Zugriff auf eine erlaubte Hochschul-E-Mail-Adresse.
Es werden keine Uni-Passwörter abgefragt. Das ist kein offizieller THM-SSO
und kein Nachweis des aktuellen Studierendenstatus.
Im lokalen Testmodus wird auch kein echter Mailboxzugriff nachgewiesen.

Akteure sind Studierende mit erlaubtem Postfach und die Person, die den Server
einrichtet. Andere Module benötigen die bestätigte Nutzer-ID für ihre eigenen
Rechteprüfungen. React zeigt den Dialog, Express prüft die Anmeldung und SQLite
speichert Konten/Sitzungen. Der SMTP-Anbieter stellt die Mail zu.
Passwörter, Profilverwaltung und ein zentraler Hochschul-Identitätsdienst sind
nicht Teil dieses Bereichs.

## F1–F3: UC-01 Anmelden und Abmelden

Auslöser: Ein Nutzer möchte auf seine Aufgaben zugreifen.
Voraussetzungen: konfigurierte Empfängerdomain, laufendes Backend mit migrierter
Datenbank; im SMTP-Modus ein erreichbarer Versanddienst und Postfachzugriff.
1. Nutzer gibt seine Hochschul-E-Mail ein.
2. Backend prüft die Adresse und erzeugt einen Link mit 15 Minuten Gültigkeit.
3. Im SMTP-Modus geht der Link per Mail raus. Im lokalen Testmodus steht er nur im Backend-Terminal.
4. Nutzer öffnet den Link und klickt auf „Anmeldung bestätigen“. Laden allein verbraucht ihn nicht.
5. Konto und eine neue Sitzung werden gemeinsam gespeichert. Der Link ist danach verbraucht.
6. Die Sitzung bleibt nach Neuladen und Backend-Neustart erhalten, höchstens sieben Tage.
7. „Abmelden“ löscht die Sitzung auf dem Server und das Cookie im Browser.

Ergebnis bei Erfolg: Ein User und eine gültige Sitzung existieren; geschützte
Module erhalten diesen User. Bestehende Konten behalten ihre ID und den Zeitpunkt
der ersten Bestätigung. Die bisherige Sitzung desselben Browsers wird ersetzt.
Sitzungen auf anderen Geräten bleiben gültig. Bei Abbruch vor Bestätigung wird
kein neues Konto angelegt. Es gibt keine automatische Anmeldung durch Linkabruf.

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

## D1/D2: Daten und Typen

| Objekt/Tabelle | Felder und Bedeutung |
|---|---|
| User / users | id: UUID als String, Primärschlüssel; email: normalisierter String, eindeutig; emailVerifiedAt und createdAt: Zeit der ersten Bestätigung |
| auth_login_tokens | tokenHash: SHA-256-Hexstring, Primärschlüssel; email; createdAt; expiresAt: 15 Minuten später; usedAt: null oder Verbrauchszeit |
| auth_sessions | tokenHash: SHA-256-Hexstring, Primärschlüssel; userId: Fremdschlüssel auf users.id; createdAt; expiresAt: sieben Tage später |
| auth_limits | keyHash: SHA-256-Hexstring, Primärschlüssel; hits: ganzzahliger Versuchszähler; expiresAt: Ende des 15-Minuten-Fensters |
| auth_settings | id: stets 1, Primärschlüssel; mailMode: local oder smtp; bindet die Datenbank an ihren Anmeldemodus |

Ein User hat null bis viele Sitzungen. Löschen des Users löscht seine Sitzungen
über ON DELETE CASCADE. Ein noch unbestätigter Link hat keinen User-Fremdschlüssel,
da das Konto erst bei Bestätigung entsteht. Diese Version bietet keinen Dialog
zum Löschen von Konten.

Zeitpunkte sind UTC als ISO-Strings; Ratenlimits verwenden Millisekunden.
Roh-Tokens liegen nicht in der Datenbank. Session-Token werden ausschließlich
im HttpOnly-Cookie übertragen, nicht in der JSON-Antwort.

Die Adresse hat höchstens 254 Zeichen, ihr lokaler Teil höchstens 64. Erlaubt
sind ASCII-Buchstaben, Ziffern und die im Validator aufgeführten Mailboxzeichen;
Punkte nur zwischen nichtleeren Teilen. CR/LF werden abgewiesen. Domains werden
exakt ohne Beachtung der Groß-/Kleinschreibung verglichen.

## B1–B3: Oberfläche und Hintergrundverarbeitung

| Zustand | Anzeige und Aktion |
|---|---|
| Start | „Anmeldung wird geprüft“; danach Login oder geschützter Bereich |
| Nicht angemeldet | Beschriftetes E-Mail-Feld und „Anmeldelink anfordern“ |
| Anfrage läuft | Schaltfläche deaktiviert, Rückmeldung nach Erfolg/Fehler |
| Link geöffnet | „Anmeldung bestätigen“ oder Rückkehr zum Login; Fragment wird aus der URL entfernt |
| Angemeldet | E-Mail, Abmelden und die eingebettete Fachansicht |
| Sitzung ungültig | Nach 401 aus einer Fachansicht wird diese ausgeblendet und erneute Anmeldung angeboten |
| Start ohne Verbindung | Fehlermeldung mit „Erneut versuchen“ |

B2: Kein fachlicher Batchdialog. Technisch werden abgelaufene/verwendete Links,
abgelaufene Sitzungen und Ratenlimits beim Start und alle 15 Minuten bereinigt.
B3: Nicht anwendbar; die Anmeldung erzeugt keine Druckausgaben.

## S1–S3: Schnittstellen, Migration, Inbetriebnahme

HTTP-Verträge und Startbefehle stehen in [INSTALL.md](../../INSTALL.md).
Erfolg: {data: ...}; Fehler: {error: {code, message}}.
User ist das einzige Kontoobjekt, das an den Browser ausgegeben wird.
Serverintern: requireAuth setzt req.user; userDirectory.findVerifiedByEmail
liefert den bestätigten Nutzer oder null. Gruppen-/Aufgabenrechte liegen in den
jeweiligen Modulen, nicht in der Anmeldung.

Die wiederholbare Auth-Migration erhält vorhandene Tabellen und Konten. Ein
Wechsel von lokalem Testbetrieb zu SMTP verlangt eine neue Datenbank, damit
Testkonten nicht als wirklich bestätigt übernommen werden. SMTP nutzt einen
konfigurierten Absender; Empfänger bleiben die erlaubten Hochschuladressen.

## N1/N2: Überprüfbare Qualitätsanforderungen

- Wiederholte oder gleichzeitige Verwendung desselben Links erzeugt höchstens eine Sitzung.
- Datenbankfehler bei Bestätigung hinterlassen weder ein halbes Konto noch einen verbrauchten Link ohne Sitzung.
- Falscher Origin, fehlender eigener Header oder falscher Inhaltstyp verhindern schreibende Anfragen.
- Mailausfälle geben keine SMTP-Zugangsdaten aus und erzeugen keine gültige Anmeldung.
- Ungültige Zertifikate und SMTP ohne TLS werden abgewiesen.
- Neuladen und Backend-Neustart erhalten eine gültige Sitzung; Logout widerruft sie sofort.
- Secrets und Sitzungstoken werden nicht im LocalStorage oder öffentlichen Repository gespeichert.

Konkrete Prüffälle und der Stand der Abnahme stehen in
[Auth-Abschluss](../auth-abschluss.md). Ein Lastziel für große Nutzerzahlen wird
nicht behauptet; der geprüfte Umfang ist eine lokale App mit einem Backend.

## Offene Integration

Die Empfängeradressen in den bereitgestellten Kursmails belegen mnd.thm.de.
Weitere Domains müssen für die betreffenden Teamkonten bestätigt werden.
campus.example ist nur für lokale Tests. Echter SMTP-Versand wurde von Jaouad
geprüft; weitere Rechner benötigen eine eigene lokale Konfiguration.
Aufgaben und Gruppen sind in einem separaten Prüfaufbau mit der gemeinsamen
App-Fabrik verbunden. Die Montage in main erfolgt mit dem Team. Kommentare liefern
bis zur Rechteintegration 503, ohne Anmeldung 401.

Bei einer 401-Antwort aus einem geschützten Modul zeigt AuthGate wieder den Login.
useAuth stellt den eingebetteten Ansichten Nutzer und Logout zur Verfügung.

## E1/E2: Leseanleitung und Begriffe

Zu UC-01 gehören [Architektur](../arch/auth.md),
[Anmeldeentscheidung](../adr/auth-anmeldung.md) und der
[Code-Walkthrough](../auth-abschluss.md).
Ein **Einmallink** enthält einen zufälligen, kurz gültigen Nachweis.
Eine **Sitzung** erlaubt Folgezugriffe ohne erneute Mail.
Ein **Hash** ist ein Prüfwert; der ursprüngliche Token wird dafür nicht gespeichert.
**SMTP** ist das Protokoll für den Mailversand. **SSO** wäre die Anmeldung über
einen vorhandenen Identitätsdienst und ist hier nicht implementiert.

## Eingesetzte KI-Werkzeuge

ChatGPT/Codex am 22.–24.09.2026: Entwurf, Code, Tests und Dokumentation.
Automatisierte Prüfergebnisse stehen in docs/auth-abschluss.md und docs/auth-handoff.md.
Zusätzlich wurden die SMTP-Wege mit tatsächlichen lokalen TLS-Verbindungen
einschließlich negativer Fälle geprüft. Dokumentnamen, Datenfelder und Verweise
wurden mit dem Code abgeglichen. Keine echte Zustellung wird daraus abgeleitet.
Jaouads manueller Funktionstest ist im Abschlussbericht festgehalten;
persönliche Code-Erklärung und gemeinsame Teamabnahme stehen noch aus.
