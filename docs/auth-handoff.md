# Anmeldung: Stand und Übergabe

Arbeitsbranch: work/jaouad-auth. Noch nicht in main integriert.
Basis des gemeinsamen Codes: main 7b45b5d.

## Dienstag, 22.09.
Anmeldelinks, Mailprüfung, Kontoanlage und 13 Tests.
Commit: 470dee3e90ae4bbe37950b7e4fec39ca17da1c26.

## Mittwoch, 23.09.
Sitzungen in SQLite, requireAuth, Logout, HTTP-Routen, Ratenlimits,
Schutz schreibender Anfragen, Login-Oberfläche und konfigurierbarer Mailadapter.
Die Sitzung übersteht Neuladen und Backend-Neustart. Link und Sitzung werden
gemeinsam in einer Transaktion verarbeitet.

MAIL_MODE=local ermöglicht einen vollständigen lokalen Ablauf ohne Mailkonto,
aber bestätigt keinen echten Postfachzugriff. MAIL_MODE=smtp ist implementiert;
echte Zustellung ist mangels konfiguriertem Mailkonto noch nicht getestet.
Keine echten Mails wurden versendet.

## Gemeinsame Dateien und Anschluss
server.js enthält keinen festen Testnutzer und keine pauschal erlaubten Rechte mehr.
Der bisherige Kommentarrouter bleibt unverändert in seinem Modul, ist aber noch
nicht wieder angebunden. Stattdessen: 401 ohne Anmeldung, 503 bis zur Rechteintegration.
App.jsx zeigt hinter AuthGate vorerst eine Willkommensansicht. Hier kann die
Aufgabenansicht eingesetzt werden; AuthGate nimmt sie als children entgegen.

Backend: requireAuth und userDirectory aus createApp nutzen.
Frontend: api() für JSON-Aufrufe mit dem benötigten Header verwenden.
Vor Anbindung der Kommentare müssen await und die Übergabe von Task-ID/Taskobjekt
mit Ahshan und der Aufgaben-/Gruppenverwaltung abgestimmt werden.
Globale Startbefehle lesen jetzt backend/.env ein. Setup siehe INSTALL.md.

## Prüfung
Am 23.09.2026 unter Node.js 24.19.0:
- Backend npm test: 26 Tests bestanden, keine fehlgeschlagen oder übersprungen.
- Frontend npm run build: erfolgreich.
- Frische Arbeitskopie: npm ci in Root, Backend und Frontend erfolgreich;
  Migration zweimal, 26 Tests und Frontend-Build erfolgreich.
- Start über npm run dev im Root, HTML-Fallback und kompletter lokaler
  Login-/Logout-Ablauf per HTTP über den Vite-Proxy erfolgreich.
- Echter Browsertest noch offen: Der Browser konnte in der Arbeitsumgebung
  nicht gestartet werden (Download-/Laufzeitprobleme). Darstellung und Klickablauf
  müssen auf einem Teamrechner geprüft werden. Ein Build ersetzt diesen Test nicht.

Tests verwenden temporäre SQLite-Dateien und erfundene Adressen unter campus.example.
SMTP-Adapter ist mit einem Testtransport geprüft, keine echte Zustellung.
Das ist keine Produktivabnahme.

## Donnerstag, 24.09.
Maildomain und Versandkonfiguration bestätigen, echte Zustellung gemeinsam prüfen.
Aufgaben, Gruppen und Kommentare anbinden; Rechtefälle und Neuinstallation testen.
Spec und Architektur mit dem Gesamtprojekt abgleichen. Eigenen Code erklären können.

## Freitag, 25.09.
Abnahme, Fehlerkorrekturen und Abgabe. Kein künstliches Verteilen fertiger Commits.
Finalen Tag und Abgabe-Mail erst nach Teamprüfung erstellen.

## Zum Erklären
1. Wieso speichern wir nur Tokenhashes?
2. Warum müssen Linkverbrauch und Sitzungserstellung gemeinsam gespeichert werden?
3. Was passiert beim Logout und nach sieben Tagen?
4. Wieso beweist der lokale Modus keinen Mailboxzugriff?
5. Wozu prüfen wir Origin und den zusätzlichen Header?
