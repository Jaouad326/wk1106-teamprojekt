# StudyPrio – Architekturbeschreibung nach arc42

**Stand:** 25.09.2026

## 1. Einführung und Ziele
StudyPrio trennt Browseroberfläche, HTTP-Schnittstellen, fachliche Services und Persistenz. Ziele sind fachliche Modularisierung, serverseitige Regeln, lokale Testbarkeit und nachvollziehbare Datenhaltung.

## 2. Randbedingungen
JavaScript/ES-Module, React 18, Vite 5, Node.js, Express 4, SQLite, JSON/HTTP. Auth erfolgt über E-Mail-Einmallinks; offizielles SSO ist nicht Bestandteil. M3 zielt auf lokalen Einzelserverbetrieb.

## 3. Systemkontext
![Systemkontext](diagrams/systemkontext.svg)

Die Browseranwendung kommuniziert mit Express. Express verwendet SQLite und im SMTP-Modus einen Mailversanddienst. Quelle: diagrams/systemkontext.mmd.

## 4. Lösungsstrategie
- Fachmodule für Auth, Tasks, Groups und Comments.
- Route → Service → Repository/Migration.
- Dependency Injection über die App-Fabrik.
- Servervalidierung, Berechtigung und Priorität im Backend.
- Transaktionen bei kritischen konkurrierenden Änderungen.
- React Context/Hooks für Auth- und UI-Zustand.
- isoliert testbare Fachlogik.

## 5. Bausteinsicht
Gesamtsystem:
Browser/React → JSON/HTTP → Express API → SQLite.

Frontend: AuthGate/AuthContext, Dashboard, TasksPage, GroupsPage und Kommentar-/UI-Komponenten.

Tasks: taskRoutes.js, taskService.js, taskRepository.js, taskPriority.js, taskValidation.js, taskMigration.js und frontend/src/features/tasks/TasksPage.jsx. taskService ist die fachliche Fassade; Priorität kommt aus taskPriority.js.

Auth: Routes, Service, Repository, Session-Service, Mailer und React-Auth. Details in arch/auth.md.

Groups: Group Service und Invitation Service; group_members ist die maßgebliche Quelle der aktuellen Mitgliedschaft. Details in arch/groups.md.

Comments: commentRoutes.js kapselt die HTTP-Schnittstelle. Die Route nutzt taskService für die Aufgabenberechtigungsprüfung und openDb für das direkte Lesen/Schreiben der Kommentarzeilen; eine separate Comment-Service-/Repository-Schicht ist im M3-Stand nicht vorhanden.

## 6. Laufzeitsichten
### Aufgabe erstellen
TasksPage → API Client → POST /api/tasks → taskRoutes → taskService → Validierung/Access → taskRepository → SQLite → Antwort.

### Priorisierung
GET /api/tasks → taskService.listTasks → zugängliche Aufgaben → calculateTaskPriority → Sortierung nach Score DESC und dueAt ASC → JSON → TasksPage.

### Gruppen
Einladung wird als pending gespeichert. Annahme schreibt group_members und accepted in einer Transaktion. Owner-Austritt mit Nachfolge oder Auflösung ist ebenfalls transaktional.

### Auth
Anmeldelink anfordern → explizit bestätigen → User/Sitzung transaktional speichern → HttpOnly-Cookie. Details in arch/auth.md.

## 7. Verteilung
Lokal: Browser :5173 → Vite → /api → Express :3000 → SQLite. SMTP-Modus: Express → TLS/SMTP → Mailanbieter. Öffentlicher Betrieb ist als HTTPS-Reverse-Proxy-Ziel dokumentiert, nicht als produktiver Deployment-Nachweis.

## 8. Querschnittliche Konzepte
**Sicherheit:** HttpOnly-Cookie, zufällige Token und Hashes, Origin-/Header-Prüfung, serverseitige Rechte, Ratenlimits.

**Validierung:** Backend validiert fachliche Eingaben; Frontend ergänzt Benutzerfeedback.

**Fehler:** strukturierte error.code/message/fields; keine internen DB-/SMTP-Details.

**Persistenz:** Foreign Keys, Indizes und Transaktionen.

**Priorität:** reine Fachfunktion, dadurch isoliert testbar.

**Frontend:** Feature-Struktur, API-Client und AuthContext/useAuth.

## 9. Architekturentscheidungen
- adr/auth-anmeldung.md – E-Mail-Link
- adr/auth-sitzungen.md – SQLite-Sitzungen
- adr/auth-mailmodus.md – lokale/SMTP-Modi
- adr/frontend-backend-architecture.md – Frontend/Backend-Trennung
- adr/persistence-sqlite.md – SQLite-Persistenz

Kapitel 10 und 11 entfallen nach Kursvorgabe.

## 12. Glossar
Task = Aufgabe. Priority Score = numerische Priorität. Owner = Gruppenleitung. Membership = group_members-Eintrag. Session = serverseitige Anmeldung. Repository = Datenbankzugriff. Service = Fachlogik.

## KI-Einsatz
Im Projekt wurden **ChatGPT Astra**, **Claude Sonnet 5** und **GPT-5.6 Terra** als unterstützende KI-Werkzeuge eingesetzt. Sie dienten unter anderem für Architekturentwürfe, Code-/Testideen und Dokumentation. Die Architektur wurde anschließend anhand der tatsächlichen Dateien, Schnittstellen, Datenstrukturen und Tests abgeglichen. Nicht implementierte Funktionen werden nicht als vorhanden dargestellt.
