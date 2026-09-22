# Jaouads Auth-Paket: Übergabe und nächste Schritte

Basis: main 7b45b5d vom Abruf am 22.09.2026. Arbeitsbranch: work/jaouad-auth.
Erster Zwischenstand zur gemeinsamen Prüfung; noch nicht in main integriert.

## Heute: Dienstag, 22.09.

Eigene erste Lieferung: Mailvalidierung, kurzlebiger Einmal-Link, Speicherung
nur des Tokenhashes, atomare Verifikation/Kontoanlage, Benutzerverzeichnis.
Keine öffentlichen Routen, echte Zustellung oder Sitzung vorhanden.
Ahshans globale Dateien, Kommentarmodul und Abhängigkeiten bleiben unverändert.

Aus `backend/` mit installierten Abhängigkeiten:

```sh
node --test tests/auth/auth.test.js
```

Die Tests öffnen reale temporäre SQLite-Datenbanken und löschen nur ihre eigenen
Testverzeichnisse. Sie versenden keine Nachrichten und ändern keine Projekt-Datenbank.
Domain campus.example ist ausschließlich eine erfundene Testdomain.

## Mittwoch, 23.09. – nächster echter Arbeitsschritt

- Zugelassene THM-Maildomains und konfigurierbaren Versandweg klären.
- Persistente Sitzung, requireAuth, Logout, CSRF und Rate-Limits implementieren.
- Auth-HTTP-Routen und Login-/Bestätigungsoberfläche anschließen.
- Echte Zustellung prüfen, falls Zugangsdaten verfügbar; sonst eindeutig als blockiert markieren.
- Feste Testanmeldung aus dem gemeinsamen Server erst im Zuge sicherer Integration ersetzen.

## Donnerstag, 24.09.

- Auth mit Aufgaben/Gruppen/Kommentaren integrieren und Rechtefälle testen.
- Fehlendes await und AccessService-Vertrag im Kommentarcode mit Ahshan klären.
- Spec/Architektur anhand tatsächlichen Codes aktualisieren; Installationsprobe.
- Alle Teammitglieder prüfen und erklären eigene sowie angrenzende Bereiche.

## Freitag, 25.09.

Nur Abnahme/Fehlerkorrektur und autorisierte Integration, finaler annotated Tag
auf Default-Branch und Abgabe-Mail. Nicht bis Freitag mit der ersten Integration warten.
Die Arbeit ist nicht automatisch eingeplant; die nächsten Schritte erfolgen in
weiteren gemeinsamen Arbeitssitzungen. Keine künstliche Verteilung fertiger Commits.

## Prüfergebnis

Am 22.09.2026 unter Node.js 24.19.0 nach `npm ci --no-audit --no-fund`
im Backend ausgeführt: `node --test tests/auth/auth.test.js`.
Ergebnis: 13 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen.

Geprüft wurden unter anderem Ablaufgrenze, Einmalverwendung, konkurrierende
Bestätigung, Versandfehler, Eingabevalidierung und Transaktions-Rollback.
Dies ist ein automatisierter Test des isolierten Auth-Kerns, keine
Produktivabnahme und kein Test des vollständigen Login-Flows. Echte Zustellung,
Browser-Sitzung, HTTP-Schutzmaßnahmen und Integration sind noch offen.

## Zum Erklären

1. Warum liegt nur ein Hash und nicht der vollständige Linktoken in SQLite?
2. Warum ist E-Mail-Zugriff kein Beweis für aktuellen Studierendenstatus?
3. Was verhindert zwei erfolgreiche Verwendungen desselben Links?
4. Warum reicht ein verifiziertes Konto allein noch nicht für einen eingeloggten Browser?
