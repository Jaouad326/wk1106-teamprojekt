# StudyPrio – Softwarespezifikation

**Meilenstein:** M3, SS 2026  
**Stand:** 25.09.2026

## 1. Projektgrundlagen

### 1.1 Ziel und Zweck
StudyPrio unterstützt Studierende dabei, persönliche und gemeinsame Aufgaben anhand von Termin, Wichtigkeit, Schwierigkeit und geschätztem Aufwand zu organisieren. Die Anwendung berechnet daraus serverseitig eine Priorität und stellt Aufgaben in einer priorisierten Liste dar.

### 1.2 Systemgrenze
**Im Umfang:** Anmeldung per Hochschul-E-Mail-Einmallink, Dashboard, Aufgabenverwaltung, Priorisierung, Gruppen und Einladungen, Kommentare, Fokusmodus/UI, SQLite-Persistenz und JSON-API.

**Nicht im Umfang:** offizielles THM-SSO, Passwortverwaltung, native Mobile-App und produktiver Mehrserverbetrieb.

### 1.3 Stakeholder und Rollen
- **Studierende:** Aufgaben planen, bearbeiten, priorisieren und kommentieren.
- **Gruppenmitglieder:** gemeinsame Aufgaben und Kommentare nutzen.
- **Gruppen-Owner:** Gruppe und Einladungen verwalten.
- **Projektteam:** Software, Tests, Dokumentation und Präsentation liefern.
- **Betreuer:** prüft Spezifikation, Architektur, Implementierung und Code-Walkthrough.

### 1.4 Architekturüberblick
Browser/React kommuniziert per JSON/HTTP mit der Express-API. Das Backend übernimmt Validierung, Autorisierung und fachliche Priorisierung und persistiert die Daten in SQLite. Die Architektur ist in [docs/architecture.md](architecture.md) beschrieben.

## 2. Abläufe und Funktionen

### 2.1 Geschäftsprozesse
**BP-01 Aufgabe planen:** Benutzer meldet sich an → erstellt/bearbeitet Aufgabe → Backend validiert und speichert → Priorität wird bei der Abfrage berechnet → Liste wird nach Priorität sortiert.

**BP-02 Gruppenarbeit:** Owner erstellt Gruppe → bestätigter Benutzer wird eingeladen → Einladung wird angenommen → Mitgliedschaft entsteht → Gruppenaufgaben und Kommentare werden entsprechend der aktuellen Mitgliedschaft zugänglich.

**BP-03 Anmeldung:** Benutzer fordert Link an → Link wird explizit bestätigt → User und Sitzung werden gespeichert → geschützte Funktionen sind verfügbar → Logout widerruft die Sitzung.

### 2.2 Anwendungsfälle

#### UC-01 Anmeldung und Abmeldung
**Akteur:** Studierende.  
**Vorbedingung:** keine bestehende Sitzung erforderlich.  
**Ablauf:** E-Mail eingeben → Einmallink anfordern → Link explizit bestätigen → Sitzung erzeugen → geschützte Anwendung öffnen. Logout beendet die Sitzung.  
**Nachbedingung:** gültige Sitzung bzw. nach Logout keine gültige Sitzung.  
**Akzeptanz:** abgelaufene oder bereits verwendete Links werden abgewiesen.

#### UC-02 Dashboard
**Akteur:** angemeldete Studierende.  
Nach Anmeldung werden Aufgabenstatus und verfügbare Bereiche angezeigt. Die Darstellung darf fachliche Prioritätswerte nicht verändern.

#### UC-03 Aufgabe erstellen
**Akteur:** angemeldete Studierende.  
Pflichtfelder: Titel, Fälligkeit, Aufwand. Wichtigkeit und Schwierigkeit liegen jeweils zwischen 1 und 5; Aufwand zwischen 0,25 und 200 Stunden. Beschreibung, Status und Gruppenzuordnung sind möglich. Serverseitige Validierung ist verbindlich.

#### UC-04 Aufgabe anzeigen und bearbeiten
Aufgaben werden mit Priorität, Fälligkeit, Status, Wichtigkeit, Schwierigkeit und Aufwand dargestellt und können bei vorhandener Schreibberechtigung geändert werden.

#### UC-05 Aufgabe löschen
Eine Aufgabe kann bei vorhandener Schreibberechtigung gelöscht werden.

#### UC-06 Status ändern
Statuswerte sind `open`, `in_progress` und `done`. Erledigte Aufgaben werden als erledigt dargestellt und erhalten keine aktive Priorität.

#### UC-07 Priorität berechnen und sortieren
Die Berechnung erfolgt ausschließlich serverseitig.

- `effortPenalty = min(effortHours, 20) / 10`
- `score = round((importance * 2 + urgency * 2 + difficulty - effortPenalty), 1)`

Urgency: überfällig = 5; bis 1 Tag = 4; bis 3 Tage = 3; bis 7 Tage = 2; später = 1.  
Labels: ab 16 **Sehr hoch**, ab 11 **Hoch**, ab 7 **Mittel**, sonst **Niedrig**. `done` erhält Score 0 und Label **Erledigt**. Die API sortiert nach Score absteigend, bei Gleichstand nach Fälligkeit aufsteigend.

#### UC-08 Gruppen
Gruppen können erstellt und angezeigt werden. Mitglieder und Gruppenaufgaben werden über die aktuelle Mitgliedschaft autorisiert. Die konkrete Gruppenlogik ist im Backend-Modul `backend/src/modules/groups/` umgesetzt.

#### UC-09 Einladungen
Ein Owner lädt bestätigte Benutzer ein. Eingeladene Benutzer nehmen eigene offene Einladungen an oder lehnen sie ab. Eine Einladung allein erzeugt keine Mitgliedschaft.

#### UC-10 Kommentare
Berechtigte Benutzer lesen und erstellen Kommentare zu Aufgaben. Die Aufgabenberechtigungsprüfung erfolgt über den Task Service; die Kommentarzeilen werden im M3-Stand direkt über die Datenbank persistiert.

#### UC-11 Fokusmodus und UI
Fokusmodus und UI-Einstellungen verändern die Darstellung, nicht die fachliche Prioritätsberechnung.

## 3. Daten

### 3.1 Datenmodell
Wesentliche Entitäten sind `users`, `auth_login_tokens`, `auth_sessions`, `auth_limits`, `tasks`, `groups`, `group_members`, `group_invitations` und `comments`. Das relationale Modell ist in [docs/diagrams/datenmodell.svg](diagrams/datenmodell.svg) mit reproduzierbarem Mermaid-Quelltext dokumentiert.

### 3.2 Datentypenverzeichnis (D2)
| Typ/Feld | Typ | Einschränkung/Bedeutung |
|---|---|---|
| User.id | string/UUID | Primärschlüssel |
| User.email | string | normalisierte E-Mail-Adresse |
| Task.id | string/UUID | Primärschlüssel |
| Task.title | string | Pflichtfeld |
| Task.description | string/null | optionale Beschreibung |
| Task.dueAt | ISO-Datetime | Pflichtfeld |
| Task.importance | integer | 1–5 |
| Task.difficulty | integer | 1–5 |
| Task.effortHours | number | 0,25–200 |
| Task.status | enum | open / in_progress / done |
| Task.ownerId | string/UUID | FK auf users |
| Task.groupId | string/UUID/null | optionale FK auf groups |
| Group.id | string/UUID | Primärschlüssel |
| Group.name | string | Gruppenname |
| Comment.id | string/UUID | Primärschlüssel |
| Comment.taskId | string/UUID | FK auf tasks |
| Comment.authorId | string/UUID | FK auf users |
| Comment.body | string | Kommentartext |
| Priority.score | number | berechneter Wert, nicht persistent |
| Priority.label | enum | Sehr hoch / Hoch / Mittel / Niedrig / Erledigt |

Die konkreten SQL-Spalten und Constraints stehen in den Migrationen unter `backend/src/modules/*/*Migration.js`.

## 4. Benutzerschnittstelle

### 4.1 Aufgabenansicht
Die Aufgabenansicht bietet Erstellen, Bearbeiten, Löschen und Statusänderung. Pro Aufgabe werden Titel, Beschreibung, Fälligkeit, Prioritätslabel/-wert, Wichtigkeit, Schwierigkeit, Aufwand und ggf. Gruppe angezeigt.

### 4.2 Anmeldung
Die Login-Oberfläche fordert die E-Mail-Adresse an und unterstützt die explizite Bestätigung des Einmallinks. Die Session wird über ein HttpOnly-Cookie gehalten.

### 4.3 Nicht anwendbare UI-Bausteine
- **B2 Batch:** nicht anwendbar; StudyPrio besitzt keine Batch-Schnittstelle.
- **B3 Druckausgaben:** nicht anwendbar; es gibt keine fachliche Druckausgabe.

## 5. Schnittstellen

### 5.1 Nachbarsysteme
- Browser ↔ Express API über JSON/HTTP.
- Express ↔ SMTP-Versanddienst im SMTP-Modus.
- Express ↔ SQLite als Persistenz.

### 5.2 API
Backend unter `/api`. Erfolgsantworten verwenden `{ data: ... }`, Fehler `{ error: { code, message, fields? } }`. Zentrale Auth-Endpunkte sind in INSTALL.md aufgeführt; Tasks, Groups und Comments verwenden die entsprechenden Feature-Routen.

### 5.3 Datenmigration
Migrationen werden beim Setup mit `npm run migrate` ausgeführt. Sie sind wiederholbar und löschen keine Nutzer. Für produktive Datenbanken ist vor einer Migration eine Sicherung vorgesehen.

### 5.4 Inbetriebnahme
Die vollständige Inbetriebnahme steht in [INSTALL.md](../INSTALL.md).

## 6. Übergreifendes

### 6.1 Nichtfunktionale Anforderungen
| ID | Anforderung |
|---|---|
| NFR-01 | HttpOnly-Sitzung; Session-Tokens nicht im LocalStorage |
| NFR-02 | serverseitige Authentifizierung und Autorisierung |
| NFR-03 | serverseitige Validierung fachlicher Eingaben |
| NFR-04 | automatisierte Unit-, Integrations- und Mailtests |
| NFR-05 | lokaler Betrieb mit Node.js/npm/SQLite |
| NFR-06 | sichtbare Priorität und Status in der Aufgabenansicht |
| NFR-07 | reproduzierbare Migration und temporäre Testdatenbanken |
| NFR-08 | nachvollziehbare Architekturentscheidungen und Traceability |

### 6.2 Testbarkeit und Akzeptanz
Die Prioritätsfunktion ist isoliert testbar. HTTP-/Integrationstests prüfen Authentifizierung, Berechtigungen, Persistenz und zentrale Gruppen-/Task-Abläufe. Frontend-Build und dokumentierte Browserabläufe ergänzen die automatisierten Tests. Die Zuordnung von Use Cases zu Code und Nachweisen steht in [docs/traceability.md](traceability.md).

## 7. Ergänzendes

### 7.1 Leseanleitung
Empfohlene Reihenfolge: diese Spezifikation → [docs/architecture.md](architecture.md) → [docs/traceability.md](traceability.md) → [INSTALL.md](../INSTALL.md) → ADRs unter [docs/adr/](adr/).

### 7.2 Glossar
**Task:** Aufgabe. **Priority Score:** numerischer Prioritätswert. **Owner:** Gruppenbesitzer. **Membership:** Eintrag in `group_members`. **Session:** serverseitige Anmeldung. **Repository:** gekapselter Datenbankzugriff. **Service:** Fachlogik. **ADR:** Architecture Decision Record.

### 7.3 KI-Einsatz
Im Projekt wurden **ChatGPT Astra**, **Claude Sonnet 5** und **GPT-5.6 Terra** als unterstützende KI-Werkzeuge eingesetzt. Verwendet wurden sie insbesondere für Entwürfe, Codevarianten, Testideen, Fehlersuche und Dokumentation. Ergebnisse wurden mit dem tatsächlichen Repository-Code, Schnittstellen und Datenfeldern abgeglichen und relevante Funktionen getestet. Die fachliche Prüfung, Anpassung und Verantwortung verbleiben beim Projektteam.

## 8. Weiterführende Dokumente
- [Architektur](architecture.md)
- [Traceability](traceability.md)
- [Entwicklung und Tests](development.md)
- [ADR-Verzeichnis](adr/)
- [Installationsanleitung](../INSTALL.md)
