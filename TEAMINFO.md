# Teaminfo & Projektidee

## Projekttitel

StudyPrio ––– Intelligenter Aufgaben- und Deadline-Planer für Studierende

## Kurzbeschreibung

StudyPrio ist eine Webanwendung, die Studierenden dabei hilft, Abgaben, Lernaufgaben und Gruppenprojekte besser zu organisieren. Aufgaben können mit Deadline, Schwierigkeit, geschätztem Aufwand und Wichtigkeit erfasst werden. Aus diesen Angaben berechnet die Anwendung eine Priorität und zeigt an, welche Aufgaben zuerst bearbeitet werden sollten.

Zusätzlich können Aufgaben in Gruppen organisiert und kommentiert werden, damit Studierende bei gemeinsamen Projekten besser zusammenarbeiten können.

## Team

| Name | Studiengang | Rolle | Git-Handle |
|---|---|---|---|
| Jaouad Achamlal | WI B.Sc. | Projektleiter/ Requirements Lead | @Jaouad326 |
| Amin Ghazouani | WI B.Sc. | Software Architect | @amin200410 |
| Haizam Riyas Mohamed | WI B.Sc. | Implementation Lead | @Haizam06 |
| Bassim Hassan | WI B.Sc. | QA/Test Lead | @Bassim20 |
| Mohamed Ahshan Siddiqali | WI B.Sc. | DevOps/Build Lead | @Ahshan06 |

Die Rollen stammen aus der ersten Planung. Alle fünf Mitglieder programmieren
und liefern Tests sowie Dokumentation. Aktuelle Funktionsbereiche: Jaouad Anmeldung,
Amin Aufgaben, Haizam Gruppen/Zugriff, Bassim Priorisierung/Dashboard,
Ahshan Aufgabendetails/Kommentare und gemeinsames Setup.

## Technologien (Stand 24.09.2026)

- **Sprache(n):** HTML, CSS, JavaScript
- **Frameworks:** React/Vite im Frontend, Node.js/Express im Backend
- **Persistenz:** SQLite
- **Authentifizierung:** eigene API für E-Mail-Einmallinks und SQLite-Sitzungen; SMTP über Nodemailer
- **Build/Tooling:** VS Code, GitHub
- **Sonstiges:** Markdown-Dokumentation

Firebase wurde durch das eigene Backend ersetzt. Die Mailbestätigung ist kein
offizieller THM-SSO; sie weist bei echter Zustellung den Postfachzugriff nach.

## Repository

- **URL:** https://github.com/Jaouad326/wk1106-teamprojekt
- **Sichtbarkeit:** öffentlich

## Vorläufig geplante KI-Werkzeuge

- ChatGPT zur Ideenfindung, Strukturierung und Formulierung von Dokumentation o.Ä.
- Claude bzw. GitHub Copilot zur Unterstützung bei Code-Vervollständigung

Die tatsächlich verwendeten Werkzeuge und Prüfungen werden in den jeweiligen
Spec-/Architekturbeiträgen offengelegt; die obige Liste ist die ursprüngliche Planung.
