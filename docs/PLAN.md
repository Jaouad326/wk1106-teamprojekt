# Arbeitsplan bis M3

Stand: 15.09.2026. Vorgeschlagene Zuordnung aus den angemeldeten Rollen und
Git-Handles; Verfügbarkeit/Vorkenntnisse sind noch nicht bestätigt.
Dieser Plan behauptet keine bereits geleisteten Beiträge.

## Umfang und Start heute

Login, persönliche und gemeinsame Aufgaben, CRUD, drei Status, nachvollziehbare
Priorisierung, Gruppenmitgliedschaft und Kommentare. Kalenderintegration,
Benachrichtigungen und KI-Vorhersagen gehören nicht zur Erstversion.

Jeder prüft sein Paket und die zugehörigen Anforderungen. Ahshan und Haizam
vereinbaren heute Workspace und App-Verzeichnis; Amin prüft das lokale API-Setup.
Falls Firebase/API nicht startbar werden, den Zuschnitt noch heute korrigieren
und den ADR aktualisieren. Zuerst eine persönliche Aufgabe end-to-end speichern.

## Fünf Arbeitspakete

| Person | Eigener Bereich | Lieferung bis 16.09. | Weitere Arbeit / Erklärung |
|---|---|---|---|
| Jaouad Achamlal (@Jaouad326) | Requirements, Aufgabenformular, Abnahme | Use Cases/Felder prüfen; TaskForm.jsx mit Feldvalidierung beginnen | Spec und CRUD-Dialoge; UC-02 vom Formular zum Service erklären |
| Amin Ghazouani (@amin200410) | Architektur und Backend-Services | ADRs prüfen; API-Gerüst, Token-Middleware und Task-Service erstellen | Task-/Gruppen-/Kommentarrechte und Laufzeitsicht; fremden Zugriff erklären |
| Haizam Riyas Mohamed (@Haizam06) | React-App, Auth, Dashboard | Vite-App, Navigation, Firebase-Login, API-Client mit ID-Token | Listen, Gruppenansichten und Integration; UI/API-Datenfluss erklären |
| Bassim Hassan (@Bassim20) | Fachlogik und Tests | calculatePriority.js mit fester Referenzzeit und Grenzfalltests | Validierung und Rechte-/Abnahmetests; Formel und Tests erklären |
| Mohamed Ahshan Siddiqali (@Ahshan06) | Build, Emulatoren, CI | npm-Workspaces, Emulator-Konfiguration, .env.example, Start-/Test-/Build-Skripte | CI, frischer Clone, INSTALL; Betriebsumgebung erklären |

Die genannten Dateien entstehen im jeweiligen Umsetzungspaket. Auch Requirements,
Architektur und DevOps erhalten echte Implementierungsarbeit. Gemeinsame Dateien
vorher einem Verantwortlichen zuordnen; niemand committet unter fremdem Namen.

## Abhängigkeiten

1. Ahshan legt Workspace-Skripte an, Haizam die App. Amin setzt API-Verträge aus A05 um.
2. Bassim liefert Fachlogik; Jaouad baut das Formular mit denselben Feldern.
3. Amin liefert Task-Service und Rechteprüfung; Haizam verbindet UI und API.
4. Erst nach lauffähigem persönlichen CRUD Gruppen/Kommentare ergänzen.
5. Tatsächlichen Code, Tests, Spec und Architektur gemeinsam abgleichen.

## Liefertermine

| Datum | Überprüfbarer Stand |
|---|---|
| 15.–16.09. | App/API/Emulatoren starten; Stack, Schema und Use Cases geprüft |
| 17.09. | Registrierung/Login; eigene Aufgabe anlegen, lesen, ändern, löschen |
| 18.09. | Prioritätslogik mit Grenzfalltests; sortiertes Dashboard mit Score-Erklärung |
| 19.–20.09. | Gruppen/Mitglieder/Kommentare; fremde Zugriffe abgewiesen |
| 21.09. | Spec vollständig; tatsächliche Fehlerliste und Akzeptanzkriterien |
| 22.09. | Architektur gegen Code geprüft; fünf ADRs bestätigt oder korrigiert |
| 23.09. | Installation aus frischem Clone; KI-Disclosure; kompletter Demo-Durchlauf |
| 24.09. | Abnahme, Integration auf main, Funktionsumfang einfrieren |
| 25.09. | Finalen Commit prüfen, annotated Tag pushen, Abgabe-Mail senden |

## Fertig und prüfbar

Verhalten läuft, relevante Fehlerfälle sind geprüft, Doku passt dazu.
Commits beschreiben wirkliche Änderungen, etwa
`feat(tasks): validate and create personal tasks` oder
`test(priority): cover overdue and equal-score tasks`. Kein Commit-Zähler als Ziel.
Abends kurz: Was läuft? Was blockiert? Wer prüft es?

Alle UC-01–UC-07 ausführen. Zusätzlich fehlendes/abgelaufenes Token, fremde Task-ID,
Nichtmitglied, ungültige Felder, Netzfehler und Neuladen nach Speicherung prüfen.
Ergebnisse mit Datum und Beobachtung in tests/README.md eintragen; keine
ungeprüften „bestanden“-Einträge.

Nach M3 M4 vorbereiten: 30 Minuten Vortrag, Fragen und individueller Walkthrough.
Jeder verfolgt auch einen fremden Use Case durch UI, API und Fachlogik.
**Der Walkthrough zählt 40/100 Punkte der dritten Säule.** Keine Bestehensgarantie.

## Offene Informationen

- Tatsächliche Verfügbarkeit aller fünf Mitglieder.
- Vorhandenes Firebase-Projekt und Hosting-Möglichkeit.
- Ob M1/M2 wahrgenommen wurden und ob weiteres Feedback existiert.
- Finaler Hosting-Weg; Emulatorbetrieb ist der geplante reproduzierbare Einstieg.

Quellen: [Kursvorgaben](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/README.md),
[Bewertung](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/BEWERTUNG.md),
Dozenten-Mails vom 15.05., 31.07., 31.08. und 14.09.2026.
