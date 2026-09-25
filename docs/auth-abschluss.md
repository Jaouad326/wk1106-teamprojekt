# Auth-Abschluss und kurze Erklärung

> Historischer Auth-Abschluss vom 24.09. Der gemeinsame Stand und die Prüfungen
> vom 25.09. stehen in [auth-integration.md](auth-integration.md).


Stand: 24.09.2026, Auth-Beitrag aus work/jaouad-auth für main. Die für Freitag geplante technische
Abschlussprüfung wird heute vorgezogen. Dieser Stand ist kein Abgabe-Tag der Gesamtapp.

## Umfang von Jaouads Teil

Implementiert sind Mailprüfung, Einmallink, Kontoanlage, eigene SQLite-Sitzung,
Logout, requireAuth, Nutzerverzeichnis, Ratenlimits, Schutz schreibender Anfragen,
Login-Oberfläche, Nutzerkontext und gemeinsamer API-Client. Dazu gehören Auth-Spec,
Architektur, drei ADRs und Installations-/Integrationshinweise.

## Prüfergebnis

| Prüfung | Ergebnis / Aussage |
|---|---|
| Backend npm test | 29 Tests; Tokenablauf/-wiederverwendung, Transaktion/Rollback, Sitzung, Cookie, Logout, CSRF, Ratenlimits, Migration, Moduswechsel und Clientfehler |
| Backend npm run test:mail | Zwei Tests bestanden: echter lokaler SMTP-Transport für STARTTLS/direktes TLS; Zertifikat-, Zugangsdaten- und TLS-Fehler; nach Fehler kein Konto, Token oder Sitzung |
| Root npm run test:team | Zwei Tests bestanden mit Amin a552cdb und Haizam 8e226e8; Anmeldung, Mitgliedschaft, Aufgabenrechte, Logout und parallele Gruppenanlage |
| Frontend npm run build | Bestanden, auch in der frischen Arbeitskopie |
| Frische Arbeitskopie | npm ci in Root/Backend/Frontend, zweimalige Migration, 29 Auth-/Clienttests, zwei SMTP-Tests und Build bestanden; npm run dev mit HTML, Deep Link, Health, Login, Cookie, Logout und Linkwiederverwendung geprüft |
| Browser | Am 24.09. Login, ausdrückliche Bestätigung, Nutzerkontext, Aufgabenanlage, Reload, Sitzungsende und Logout auf Desktop/Mobil erfolgreich geprüft |
| Echter Mailversand auf Windows | Von Jaouad am 24.09. bestätigt: Gmail-Verbindungstest, Eingang im THM-Postfach, Linkbestätigung/Login, angemeldet nach F5, Logout und Ablehnung desselben bereits verwendeten Links |

Die SMTP-Tests verwenden nur einen lokalen SMTP-Server, erfundene Konten und
bei jedem Lauf neu erzeugte Testzertifikate. Der Transport ist echt, die Zustellung
an ein Hochschulpostfach wird damit nicht geprüft. In diesen automatisierten Tests
wurden keine echten Mails gesendet. Der zusätzliche echte Versandtest wurde von
Jaouad selbst auf seinem Windows-PC durchgeführt und im Chat bestätigt.
Es werden keine Mailadressen, Zugangsdaten oder Login-Links als Testbeleg veröffentlicht.

Prüfumgebung: Node.js 24.19.0, npm 11.9.0, Linux; OpenSSL 3.0.13 für temporäre
Testzertifikate. Keine fehlgeschlagenen oder übersprungenen Tests in den genannten
Läufen. Zusätzlich hat Jaouad Installation, Migration und Mailablauf unter Windows
ausgeführt; das ist ein manueller Funktionstest, kein zweiter Lauf aller automatisierten Tests.

## Anforderungen im Code finden

| Anforderung aus UC-01 | Umsetzung | Nachweis |
|---|---|---|
| Erlaubte Mailadresse; erst nach Bestätigung ein User | authService.normalizeEmail / requestLoginLink / verifyLoginToken | auth.test.js: Mailprüfung, Kontoanlage, unveränderte Nutzer-ID |
| Link 15 Minuten und nur einmal verwendbar | authRepository.consumeLoginToken | auth.test.js: Ablaufgrenzen und gleichzeitige Bestätigung |
| Konto, Link und Sitzung zusammen speichern | consumeLoginToken mit BEGIN IMMEDIATE/COMMIT/ROLLBACK | http.test.js: absichtlich fehlgeschlagener Sitzungsinsert |
| Login überlebt Neustart; Logout widerruft sofort | sessionService / auth_sessions | http.test.js: Neustart, Rotation, sieben Tage, Logout |
| Nur erlaubte Schreibanfragen | protectWrites in authRoutes.js | http.test.js: falscher Origin, Header und Inhaltstyp |
| Keine unverschlüsselte Anmeldung am Mailserver | mailer.js requireTLS / secure | tests/mail/smtp.test.js: TLS-Wege und negative Fälle |
| Teamansichten sehen den Nutzer und Sitzungsende | AuthGate / AuthContext / api.js | Clienttest, Teamtests und Browserprüfung |

Pfade ohne Präfix beziehen sich auf backend/src/modules/auth bzw. backend/tests/auth;
Frontenddateien auf frontend/src und frontend/src/features/auth.

## Den eigenen Code in wenigen Minuten erklären

1. **Start im Formular:** AuthGate ruft über api.js POST /api/auth/request-link auf.
   Der Client sendet JSON und den eigenen Header. Der Browser setzt den Origin.
2. **Mailadresse und Link:** authService normalisiert die Adresse und prüft die
   erlaubten Domains. randomBytes erzeugt 32 zufällige Bytes. In SQLite kommt
   nur der Hash; der Mailadapter bekommt den Link mit dem Originaltoken.
3. **Warum kein Passwort?** Wir brauchen keinen Passwortspeicher und keine
   Passwort-zurücksetzen-Funktion. Dafür sind wir vom Postfach und Mailversand
   abhängig. Nodemailer liefert das Protokoll, nicht unsere Anmeldelogik.
4. **Warum erst bestätigen?** Ein bloßer Linkabruf, etwa durch einen Mailscanner,
   soll den Link nicht verbrauchen. AuthGate entfernt das Fragment aus der URL
   und sendet den Token erst beim Klick per POST.
5. **Warum eine Transaktion?** Sonst könnte der Link schon verbraucht sein,
   obwohl das Anlegen der Sitzung scheitert. Ein Fehler setzt alle zugehörigen
   Änderungen zurück. Gleichzeitige Bestätigungen können nicht beide gewinnen.
6. **Warum Hashes?** Eine ausgelesene Datenbank enthält nicht direkt verwendbare
   Link-/Sitzungstoken. Bei einer Anfrage hashen wir das vorgelegte Token und
   vergleichen den Prüfwert. Es handelt sich um zufällige Tokens, nicht Passwörter.
7. **Wie bleibt man angemeldet?** Das HttpOnly-Cookie enthält das Sitzungstoken.
   requireAuth findet damit einen noch gültigen Datensatz und setzt req.user.
   Die Datenbank bleibt beim Prozessneustart erhalten. Nach sieben Tagen endet
   die Sitzung ohne automatische Verlängerung.
8. **Was tut Logout?** Die aktuelle Sitzung wird aus SQLite gelöscht und das
   Cookie entfernt. Andere Geräte bleiben angemeldet. Gruppen-/Aufgabenrechte
   prüfen weiterhin die jeweiligen Fachmodule anhand von req.user.id.
9. **Was ist selbst gebaut?** Prüfung, Datenmodell, HTTP-Endpunkte, Transaktionen,
   Rechte-Middleware, Sitzungen, Limits und Oberfläche. React, Express, SQLite
   und Nodemailer sind verwendete Bibliotheken, keine selbst geschriebenen Teile.
10. **Was beweist die Anmeldung?** Mit echter Zustellung nur Zugriff auf die
    erlaubte Mailadresse. Kein offizieller THM-SSO und kein sicherer Nachweis,
    dass jemand aktuell eingeschrieben ist. Lokal wird auch kein Postfach geprüft.

Die Punkte im Code nachvollziehen und selbst erklären. Ein Text ersetzt nicht
Jaouads persönliche Codeprüfung. Sein manueller Anmeldetest ist bestätigt;
die gemeinsame Abnahme der vollständigen Anwendung steht noch aus.

## Echter Versand: Konfiguration auf weiteren Rechnern

Jaouad hat ein separates Gmail-Versandkonto eingerichtet und die Zustellung geprüft.
Die Anwendung fragt niemals das Uni-Passwort der Studierenden ab.
Der Absender benötigt SMTP_HOST, SMTP_PORT,
SMTP_USER, SMTP_PASS und MAIL_FROM; nur lokal in backend/.env eintragen.

1. MAIL_MODE=smtp, erlaubte Empfängerdomains und neue DATABASE_PATH eintragen.
2. Im Backend npm run migrate und npm run mail:check ausführen.
3. App starten und einen Link an das eigene erlaubte Postfach anfordern.
4. Eingang einschließlich Spamordner prüfen, Link öffnen und bestätigen.
5. Neuladen, abmelden und denselben Link nochmals öffnen: Anmeldung muss scheitern.

Der reine Verbindungstest sendet keine Mail und belegt noch keine Zustellung.
Bei Fehler Host/Port/Zugang/erlaubten Absender im Anbieterportal prüfen;
Zertifikatsprüfung nicht abschalten. Alle Befehle stehen auch in INSTALL.md.

Bei Jaouads npm-Installation wurden sieben Sicherheitsmeldungen ausgegeben
(zwei niedrig, vier hoch, eine kritisch). Ihre Betroffenheit ist noch nicht
untersucht; die bestandenen Funktionstests sind keine Aussage über diese Meldungen.
Kein automatisches npm audit fix --force wurde durchgeführt.

## Gemeinsame Abgabe nach der Zusammenführung

Für die Gesamtapp bleiben Zusammenführung, Kommentar-/Dashboard-Anschluss und
gemeinsame Abnahme erforderlich. Die Gruppenoberfläche benötigt noch den in
[auth-integration.md](auth-integration.md) beschriebenen API-Anschluss.

Vor der Abgabe müssen Code und Dokumente auf main liegen. Dort aus einer frischen
Kopie den gesamten Ablauf prüfen. Erst anschließend den endgültigen Stand mit
einem annotated Tag markieren und pushen. Beispiel nach Prüfung von Branch und SHA:

```sh
git status
git branch --show-current
git rev-parse HEAD
git tag -a v1.0.0 -m "Final submission M3"
git push origin v1.0.0
git rev-parse 'v1.0.0^{commit}'
```

Diese Befehle wurden nicht ausgeführt. Ein bereits bestehender Abgabe-Tag wird
nicht verschoben. Die Projektleitung sendet bis 25.09.2026 die Mail mit Projekt/
Gruppe, Repo-URL, Tag, SHA und privater Mitgliederbestätigung/-aktualisierung.
Keine Matrikelnummern oder individuellen Hochschuladressen öffentlich speichern.

Quelle: [Kurs-README, Abschnitte 5 und 9](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/README.md),
am 24.09.2026 abgeglichen. KI-Unterstützung: ChatGPT/Codex für Umsetzung,
Prüfabläufe, Code-Erklärungen und Dokumentation; persönliche Prüfung weiterhin durch Jaouad.
