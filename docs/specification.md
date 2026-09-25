# StudyPrio – Softwarespezifikation

**Meilenstein:** M3, SS 2026  
**Stand:** 25.09.2026

## 1. Ziel und Zweck
StudyPrio unterstützt Studierende dabei, persönliche und gemeinsame Aufgaben anhand von Termin, Wichtigkeit, Schwierigkeit und geschätztem Aufwand zu organisieren. Die Anwendung berechnet daraus eine Priorität und stellt Aufgaben in einer priorisierten Liste dar.

## 2. Systemgrenze
Enthalten sind Anmeldung per Hochschul-E-Mail-Einmallink, Dashboard, Aufgabenverwaltung, Priorisierung, Gruppen und Einladungen, Kommentare, Fokusmodus/UI, SQLite-Persistenz und JSON-API. Nicht enthalten sind offizielles THM-SSO, Passwortverwaltung, native Mobile-App und produktiver Mehrserverbetrieb.

## 3. Rollen
- Studierende: Aufgaben planen und bearbeiten.
- Gruppenmitglied: gemeinsame Aufgaben und Kommentare nutzen.
- Gruppen-Owner: Gruppe und Einladungen verwalten.
- Projektteam: Software, Tests und Dokumentation liefern.

## 4. Use Cases
### UC-01 Anmeldung und Abmeldung
E-Mail anfordern, Einmallink explizit bestätigen, Sitzung erzeugen, Logout widerruft die Sitzung. Details: spec/auth.md.

### UC-02 Dashboard
Nach Anmeldung werden Aufgabenstatus und verfügbare Fachbereiche angezeigt.

### UC-03 Aufgabe erstellen
Angemeldete Benutzer erstellen Aufgaben mit Titel, Fälligkeit, Wichtigkeit 1–5, Schwierigkeit 1–5 und Aufwand 0,25–200 Stunden. Beschreibung, Status und Gruppenzuordnung sind möglich.

### UC-04 Aufgabe anzeigen und bearbeiten
Aufgaben werden mit Priorität, Fälligkeit, Status und Eingabewerten dargestellt und können geändert werden.

### UC-05 Aufgabe löschen
Eine Aufgabe kann gelöscht werden, wenn der Benutzer Schreibberechtigung besitzt.

### UC-06 Status ändern
Statuswerte sind open, in_progress und done. Erledigte Aufgaben werden als erledigt dargestellt.

### UC-07 Priorität berechnen und sortieren
Für offene Aufgaben wird serverseitig berechnet:
effortPenalty = min(effortHours, 20) / 10
score = round((importance * 2 + urgency * 2 + difficulty - effortPenalty), 1)

Urgency: überfällig 5; bis 1 Tag 4; bis 3 Tage 3; bis 7 Tage 2; später 1.
Labels: ab 16 Sehr hoch, ab 11 Hoch, ab 7 Mittel, sonst Niedrig. Done erhält Score 0 und Label Erledigt. Die API sortiert Score absteigend, bei Gleichstand nach Fälligkeit.

### UC-08 Gruppen
Gruppen erstellen, anzeigen, Mitglieder verwalten und Gruppenaufgaben nutzen. Aktuelle Mitgliedschaft entscheidet über Zugriff. Details: spec/groups.md.

### UC-09 Einladungen
Owner laden bestätigte Benutzer ein. Eingeladene Benutzer nehmen eigene offene Einladungen an oder lehnen sie ab. Eine Einladung allein erzeugt keine Mitgliedschaft.

### UC-10 Kommentare
Berechtigte Benutzer lesen und erstellen Kommentare an Aufgaben. Das Kommentar-Routing delegiert die Aufgabenberechtigungsprüfung an den Task Service; die Kommentare werden direkt über die Datenbank persistiert.

### UC-11 Fokusmodus und UI
Fokusmodus und UI-Einstellungen verändern die Darstellung, nicht die fachliche Prioritätsberechnung.

## 5. Geschäftsregeln
1. Fachliche Aktionen benötigen eine gültige Sitzung.
2. Persönliche Aufgaben unterliegen der Besitzerprüfung.
3. Gruppenaufgaben unterliegen aktueller Gruppenmitgliedschaft.
4. Einladungen ersetzen keine Mitgliedschaft.
5. Eingaben werden serverseitig validiert.
6. Priorität wird serverseitig berechnet.
7. Kritische konkurrierende Schreibvorgänge werden transaktional abgesichert.

## 6. Datenmodell
Wesentliche Entitäten: users, auth_login_tokens, auth_sessions, auth_limits, tasks, groups, group_members, group_invitations und comments. Eine Aufgabe referenziert Besitzer und optional Gruppe.

## 7. Schnittstellen
Backend unter /api mit JSON. Erfolg: { data: ... }; Fehler: { error: { code, message, fields? } }. Beispiele: /api/auth/*, /api/tasks, /api/groups/* und aufgabenbezogene Kommentar-Endpunkte. Installation/API: INSTALL.md.

## 8. Nichtfunktionale Anforderungen
| ID | Anforderung |
|---|---|
| NFR-01 | HttpOnly-Sitzung; Tokens nicht im LocalStorage |
| NFR-02 | serverseitige Autorisierung |
| NFR-03 | fachliche Backend-Module |
| NFR-04 | automatisierte Tests |
| NFR-05 | lokaler Betrieb mit Node.js/npm/SQLite |
| NFR-06 | sichtbare Priorität und Status |
| NFR-07 | nachvollziehbare ADRs und Traceability |

## 9. Abnahme
Installation nach INSTALL.md; Auth, Tasks, Priorität, Gruppen und Dokumentationsdurchstich müssen nachvollziehbar sein. Der M3-Stand enthält ADRs und KI-Offenlegung.

## 10. Tätigkeitsschwerpunkte
Jaouad Achamlal: Auth/Sitzungen, Integration und CI/CD. Amin Ghazouani: Aufgabenmodul – Backend, Frontend, Persistenz und Tests. Haizam Riyas Mohamed: Gruppenverwaltung – Logik, UI und Einladungen. Bassim Hassan: UI/UX – Dashboard, Priorisierung, Fokusmodus und Dark Mode. Mohamed Ahshan Siddiqali: Projektbasis, Datenbank und Kommentarfunktion. Matrikelnummern und persönliche E-Mail-Adressen werden nicht öffentlich dokumentiert.

## 11. KI-Einsatz
Im Projekt wurden **ChatGPT Astra**, **Claude Sonnet 5** und **GPT-5.6 Terra** als unterstützende KI-Werkzeuge eingesetzt. Verwendet wurden sie insbesondere für Entwürfe, Codevarianten, Testideen, Fehlersuche und Dokumentation. Ergebnisse wurden mit dem tatsächlichen Repository-Code, Schnittstellen und Datenfeldern abgeglichen und relevante Funktionen getestet. Die fachliche Prüfung, Anpassung und Verantwortung verbleiben beim Projektteam.

## 12. Weiterführend
- architecture.md
- traceability.md
- development.md
- spec/auth.md
- spec/groups.md
- adr/
