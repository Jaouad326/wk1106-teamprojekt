# Auth-Baustein – erste Teillieferung

Stand 22.09.2026. Ergänzung zur späteren Gesamtarchitektur, kein Ersatz für arc42.

## Bausteine und Laufzeit (A05/A06)

`authService.js` prüft die Eingabe, erzeugt einen Zufallstoken und orchestriert
Repository/Mailer. `authRepository.js` übernimmt SQLite-Persistenz und die atomare
Tokenverwendung/Kontoanlage. `authMigration.js` erstellt ausschließlich Auth-Tabellen.
`authError.js` enthält sichere fachliche Fehler mit Code und geplantem HTTP-Status.

Der Mailer wird mit `sendLoginLink({email,url})` injiziert. Der Service erhält
eine injizierbare Uhr. Tests verwenden eine feste Uhr, temporäre echte SQLite-Dateien
und einen nur im Test existierenden Mailadapter. Die Fachlogik wird nicht gemockt.

Repository-Aufrufe öffnen jeweils eine eigene Verbindung und schließen sie wieder.
`openDb` muss daher eine neue Verbindung liefern, keinen geteilten Singleton.
Die SQLite-Bibliotheken entsprechen dem vorhandenen Backend. Bei Verifikation:
BEGIN IMMEDIATE → gültigen unbenutzten Token per UPDATE ... RETURNING verbrauchen →
Nutzer anlegen oder finden → COMMIT. Bei Fehler ROLLBACK. Konkurrenz auf derselben
Datei wird durch SQLite-Schreibsperren geregelt; busy_timeout beträgt 5 Sekunden.

## Sicherheit und Grenzen (A08)

32 zufällige Bytes aus Node `crypto.randomBytes`, SHA-256 nur zur Speicherung
dieses hochentropischen Tokens (kein Verfahren zur Passwortspeicherung).
Kein Raw-Token in Datenbank oder Serviceantwort. Der Link nutzt einen URL-Fragment-
Parameter, damit der Token beim Laden der Seite nicht als HTTP-URL mitgesendet wird.
Die spätere UI muss ihn nach expliziter Bestätigung per POST senden und aus der
Adressleiste entfernen. Ohne diese UI ist der Link noch keine nutzbare Anmeldung.

App-Origin wird serverseitig konfiguriert, nicht aus einem untrusted Host-Header
übernommen; HTTPS außer für ausdrücklich lokale HTTP-Origins.
Produktionsreife ist nicht gegeben: Sitzung, Rate-Limits, CSRF, Mailtransport,
Tokenbereinigung und Betriebskonfiguration fehlen noch.

## Integration

Noch keine Änderung an Ahshans server.js oder Migrationsrunner. Auth-Migration
vor abhängigen Benutzertabellen-Fremdschlüsseln registrieren. Repository kann
mit `createAuthRepository({openDb: getDbConnection})` angebunden werden.
Mailer, Domains und App-Origin beim Aufbau des Services explizit übergeben.

Der aktuelle Server enthält noch mockRequireAuth und immer erlaubende
Kommentarrechte. Das ist kein geschützter Betrieb. Außerdem verwenden die
Kommentar-Routen Rechteprüfungen ohne await und geben Task-IDs statt Taskobjekten
weiter. Vor Einsatz des geplanten asynchronen AccessService muss Ahshans Modul
angepasst/geprüft werden; dieses Auth-Paket ändert nicht stillschweigend sein Modul.

## Eingesetzte KI-Werkzeuge

ChatGPT/Codex für Entwurf, Code und Testentwurf. Automatisierte Prüfung wird im
Übergabedokument protokolliert. Review/Verständnis durch Jaouad und die Gesamt-
integration sind ausdrücklich offen.

Quellen: [Node crypto](https://nodejs.org/api/crypto.html),
[SQLite RETURNING](https://www.sqlite.org/lang_returning.html).
