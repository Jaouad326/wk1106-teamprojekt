# Prüfprotokoll – Amins Aufgabenpaket

Ausgeführt am 23.–24.09.2026 in der Arbeitsumgebung mit Node.js 24.19.0, npm 11.9.0,
SQLite über die vorhandenen `sqlite/sqlite3`-Pakete und Vite 5.4.21 aus dem Lockfile.
Keine menschliche Abnahme durch Amin behauptet. Basen siehe [Übergabe](tasks-handoff.md).

| Prüfung | Tatsächlicher Befund |
|---|---|
| Backend- und Formular-/Clienttests | 21 Tests bestanden, 0 fehlgeschlagen, 0 übersprungen |
| Reale Auth-Module im separaten HTTP-Aufbau | 1 Integrationstest bestanden; Login, CRUD, fremde Sitzung, CSRF und Logout |
| Echte Auth- und Gruppenmodule zusammen | 4 zusätzliche Integrationstests bestanden; Mitgliedschaft, entfernter Ersteller, Privacy/Sitzung, Migration/Kaskade und parallele Task-PATCHes |
| Gemeinsamer Prüfbuild | Erfolgreich: 39 Module; echte AuthGate/API mit TasksWorkspace |
| Team-Browserprüfung | Echte Anmeldung, Gruppenliste, Aufgaben-CRUD, Neuladen, Rechteentzug bei Bearbeitung/Neuanlage, Gruppenladefehler mit Erholung, ausdrücklicher Wechsel zu persönlich, neuer Task bei vorherigem Statusfilter und Logout erfolgreich |
| Aufgaben-Frontend-Build | Erfolgreich, 35 Module verarbeitet; isolierte Testseite importiert alle Task-Komponenten |
| Browserablauf in Chromium 153 | Erfolgreich: Validierung, Neuanlage, Gruppenwahl, Neuladen, Status-PATCH, Filter, Löschabbruch/-bestätigung |
| Fehlerverhalten im Browser | Schreibfehler erhält Formular/Eingaben; Lesefehler zeigt Fehler statt leerem Erfolg; Wiederholen lädt Daten |
| Darstellung und Bedienung | Desktop 1280×950 und Mobil 390×844; kein horizontaler Überlauf; Escape und Fokus-Rückkehr geprüft; keine JavaScript-Fehler |

Die 21 Tests enthalten Tabellen mit zusätzlichen Eingabevarianten. Sie prüfen echte
HTTP-Routen und temporäre SQLite-Dateien statt einer simulierten Task-Datenbank:

- CRUD, persistierte Werte nach neuer Service-/Repositoryinstanz, UTC, Defaults.
- Fehlende Sitzung; fremde persönliche Task; Gruppen-Nichtmitglied; entfernter Ersteller.
- Asynchrone Verweigerung und Ausfall der Rechteprüfung; direkte Service-Consumer.
- Unveränderliche/unerwartete Payloadfelder, Typ-/Zahlenbereiche, unmögliche Daten,
  Schaltjahr/Vergangenheit und Grenzwerte; Fehler lassen gespeicherte Werte unverändert.
- Parametrisierte SQL-Werte, Fremdschlüssel, wiederholte Migration und parallele PATCHes.
- Kommentare werden mit Ahshans tatsächlichem `commentMigration.js` erzeugt;
  Löschen einer Aufgabe entfernt deren Kommentare, nicht die der anderen Aufgabe.
- API-Adapter für Jaouads Funktionsclient sowie den vorgeschlagenen Methodenclient;
  UTC-Erhaltung beim Bearbeiten und Ausschluss unveränderlicher Formularfelder.

## Während der Prüfung korrigiert

Der erste Auth-Test zeigte, dass ein DELETE ohne Body von Jaouads `protectWrites`
als 415 abgewiesen wird. Der Adapter sendet nun `{}`. Der Browsertest führte zur
eindeutigen Label-Zuordnung des Statusfilters und expliziten Fokus-Rückkehr zum
Dialogauslöser. Die abschließenden Prüfungen beziehen sich auf den korrigierten Stand.
Ein Test-Fixture wurde korrigiert, damit es den beabsichtigten Ausfall der Rechteprüfung
und nicht deren zuvor gesetzte Verweigerung testet.

Die regulären Playwright-Browserdownloads lieferten beschädigte Archive. Für die
Browserprüfung wurde deshalb ein separat installiertes Chromium 153 verwendet.
Playwright/Chromium gehören nicht zu den Produktiv-Abhängigkeiten dieses Pakets.

## Abschließende Ergänzung am 24.09.

Remote-Branches nochmals abgerufen und unverändert vorgefunden. Die komplette
[Auftragsmatrix](tasks-readiness.md) ordnet jede Pflichtfunktion Code und Prüfung zu.
Die CRUD-Prüfung umfasst nun ausdrücklich auch das Wiederöffnen erledigter Aufgaben.
Der erweiterte echte Team-Browsertest reproduziert Gruppenentzug während einer
Neuanlage. Die korrigierte Oberfläche zeigt die ungültige Auswahl und verlangt eine
bewusste neue Zuordnung. Ein zuvor aktiver Erledigt-Filter verdeckt keine Neuanlage.
Gruppenladefehler und anschließende Erholung wurden ebenfalls ausgeführt.

## Grenzen

Die ursprünglichen isolierten Gruppenadapter sind weiter reine Tests. Am 24.09.
kamen vier HTTP-Tests und ein Browserablauf mit Haizams echten Modulen dazu;
Details und Commitstände stehen unter [Team-Integration](tasks-team-integration.md).
Sie importieren die unveränderten Team-Module, montieren sie aber in einer separaten
Test-App. Eine Änderung des gemeinsamen `app.js` ist damit nicht behauptet.

Kein echter Mailversand, kein Test realer Teamkonten, kein kompletter integrierter
Dashboard-/Kommentarablauf, kein Lasttest und kein Produktionsdeployment.
Die eventuelle Gruppenlöschung und die finale Montage sind offen; der vorhandene
Gruppenrouter besitzt noch keine Gruppenlöschfunktion. Der Starthelfer wurde mit
seinen temporären Checkouts für Anschlussprüfungen verwendet.
Bei neuen Teamänderungen müssen die betreffenden Anschlussprüfungen erneut laufen.
