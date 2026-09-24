# Architektur des Anmeldebereichs

Stand: 24.09.2026. Beitrag zur Gesamtarchitektur (arc42 A05/A06/A08).

## Aufteilung
- authService: E-Mail prüfen, Link erzeugen und bestätigen.
- authRepository: SQLite-Zugriffe, Transaktionen, Sitzungen und Ratenlimits.
- sessionService: Sitzungstoken und Cookie.
- authRoutes: HTTP-Endpunkte, requireAuth und Schutz schreibender Anfragen.
- mailer: lokaler Testadapter oder Nodemailer mit SMTP/TLS.
- authConfig: Einstellungen aus der Umgebung prüfen.
- app.js: Bausteine verbinden; server.js: Server starten und alte Daten bereinigen.
- AuthGate: Loginformular, explizite Bestätigung, Sitzungsprüfung und Logout.
- AuthContext/useAuth: angemeldeten Nutzer und Logout an die anderen Ansichten weitergeben.

## Ablauf und Datenbank
Jeder Repository-Aufruf öffnet eine eigene Verbindung und schließt sie wieder.
Bei Bestätigung: BEGIN IMMEDIATE, gültigen Link verbrauchen, Konto finden/anlegen,
neue Sitzung speichern und ggf. die bisherige Browsersitzung löschen, COMMIT.
Bei Fehler: ROLLBACK. So gibt es weder doppelte Linkverwendung noch ein verbrauchtes
Token ohne Sitzung. SQLite-Schreibzugriffe warten höchstens fünf Sekunden.

Die Migrationen sind wiederholbar. Auth wird vor Kommentaren angelegt.
Abgelaufene Links, Sitzungen und Ratenlimits werden beim Start und alle 15 Minuten
bereinigt. Konten bleiben erhalten.

## Schutz
Link- und Sitzungstoken bestehen aus 32 zufälligen Bytes; gespeichert wird SHA-256.
Der Linktoken liegt im URL-Fragment. Die Oberfläche liest ihn in ihren Zustand,
entfernt ihn aus der Adressleiste und sendet ihn erst nach Bestätigung per POST.
Nach einem Neuladen der Bestätigungsseite muss der Link aus der Mail erneut geöffnet werden.

Cookies: HttpOnly, SameSite=Lax, Path=/, sieben Tage; bei HTTPS zusätzlich Secure
und __Host-Präfix. Kein Domain-Attribut und kein Token im LocalStorage.
Jeder neue Login ersetzt die mitgesendete bisherige Sitzung.

Schreibende APIs benötigen passenden Origin, JSON und X-StudyPrio-Request: 1.
Es gibt keine Freigabe fremder Origins per CORS. Das schützt gegen CSRF,
einschließlich fremder Login- und Logout-Formulare. API-Antworten sind nicht cachebar.
Ratenlimits liegen in SQLite und überstehen Neustarts. Forwarded-IP-Header werden
nicht vertraut; hinter einem Proxy gilt zunächst dessen IP für alle Nutzer.
Proxykonfiguration ist vor einem öffentlichen Betrieb gesondert abzustimmen.

SMTP nutzt TLS mit Zertifikatsprüfung und Zeitlimits. Der lokale Modus ist in
Produktion und mit öffentlicher App-Origin gesperrt; der Server bindet darin
ausschließlich an 127.0.0.1. Testlinks dürfen nicht weitergegeben werden.
Unbekannte Fehler geben keine Datenbank- oder SMTP-Details an Clients weiter.

## Schnittstellen für die anderen Bereiche
createApp liefert neben app das Middleware requireAuth und userDirectory zurück.
requireAuth setzt req.user mit id, email, emailVerifiedAt, createdAt.
userDirectory.findVerifiedByEmail(email) ist asynchron und nur serverintern,
beispielsweise für eine bereits berechtigte Mitgliederverwaltung.
Ungültige, nicht erlaubte und unbekannte Adressen liefern null; Datenbankfehler
werden weitergegeben. So kann der Gruppenrouter einen unbekannten Nutzer melden.

Der synchrone Callback mountFeatures(app, {openDb, requireAuth, userDirectory})
montiert weitere Routen vor Fallback und 404-Behandlung. Sein Rückgabewert steht
unter runtime.features zur Verfügung, etwa für taskService. Verbindungen, die
vorher benötigt werden, öffnet der Aufrufer. Konkretes Beispiel und Team-Test:
[Integration](../auth-integration.md).

HTTP-Datenformat: { data: ... } oder { error: { code, message } }.
Für schreibende Frontend-Aufrufe frontend/src/api.js verwenden.
Der Client sendet auch bei DELETE ohne expliziten Body ein JSON-Objekt. Bei 401
aus geschützten Modulen benachrichtigt er AuthGate. Die geschützte Ansicht wird
dann entfernt und die erneute Anmeldung angeboten.
Kommentare sind bis zur Integration echter Aufgabenrechte gesperrt. Ahshans
Kommentarcode bleibt erhalten. Seine Rechteprüfungen benötigen beim Anschluss
await; zusätzlich ist der Vertrag Task-ID oder Taskobjekt gemeinsam festzulegen.

## Betrieb und Grenzen
Installation und API-Liste: INSTALL.md. Es gibt noch keinen produktiven Deployment-Test.
Die Migration ist kein allgemeines versioniertes Framework; _migrations aus
dem Grundgerüst wird bisher nicht als Versionshistorie verwendet.
Echte Zustellung und Rechteintegration sind noch nicht abgenommen.
Aufgaben-/Gruppenrechte wurden am 24.09. im gemeinsamen Prüfaufbau getestet;
Kommentarrechte und endgültige Montage bleiben offen. auth_settings bindet die
Datenbank an local oder smtp. Beim Wechsel ist eine neue Datenbank erforderlich,
damit lokal erzeugte Konten und Sitzungen nicht in den echten Betrieb gelangen.

## KI-Nutzung
ChatGPT/Codex für Entwurf, Umsetzung, Testentwurf und Dokumentation.
Automatisierte Tests prüfen reale temporäre SQLite-Datenbanken und HTTP-Aufrufe.
Jaouads eigene Codeprüfung und Erklärung stehen noch aus.

Quellen: [Node crypto](https://nodejs.org/api/crypto.html),
[SQLite RETURNING](https://www.sqlite.org/lang_returning.html),
[Nodemailer SMTP](https://nodemailer.com/smtp).
