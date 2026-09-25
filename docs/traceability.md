# Traceability – Use Case → Architektur → Code → Test

| UC | Architektur | Codepfade | Nachweis |
|---|---|---|---|
| UC-01 | Auth Routes/Service/Repository | backend/src/modules/auth/*, frontend/src/features/auth/* | Auth HTTP-/Mailtests |
| UC-02 | Dashboard/AuthContext | frontend/src/features/dashboard/* | Build + Browserprüfung |
| UC-03 | Task Routes/Service/Repository | backend/src/modules/tasks/*, TasksPage.jsx | Task-Integration |
| UC-04 | Task Service/TasksPage | taskService.js, TasksPage.jsx | HTTP-/Browserprüfung |
| UC-05 | Task Service/Repository | taskService.remove, DELETE Task Route | Task-Integration |
| UC-06 | Task Service/UI | Task PATCH Route, TasksPage.jsx | Task-Integration |
| UC-07 | Priority Function | taskPriority.js, taskService.listTasks | Unit-Tests |
| UC-08 | Group Service/Access | backend/src/modules/groups/* | Group-Integration |
| UC-09 | Invitation Service | groupInvitationService.js | Group-Integration |
| UC-10 | Comment Service/Repository | backend/src/modules/comments/* | Kommentar-/Integrationstest |
| UC-11 | Dashboard/UI | frontend/src/features/* | Build + Browserprüfung |

## Daten-Trace
Task → taskMigration.js/taskRepository.js/taskService.js.  
Priority → taskPriority.js.  
User/Session → Auth Migration/Repository/Session Service.  
Group/Membership/Invitation → groupMigration.js und Group Services.  
Comment → Comment Migration/Repository/Service.

## ADR-Trace
E-Mail-Link → Auth. SQLite Sessions → Auth. Mailmodus → Auth/Mailer. Frontend/Backend → Gesamtsystem. SQLite Persistence → Gesamtsystem.

## Walkthrough
1. UC-07: taskPriority.js → taskService.listTasks → Tests.
2. Gruppenaufgabe: Task Access/Service prüft aktuelle Mitgliedschaft.
3. Einladung: group_invitations ist getrennt von group_members.
4. Login nach Neustart: auth_sessions liegt in SQLite.
5. Mailmodus: ADR auth-mailmodus.md.

Bei Änderungen an Use Cases, Komponenten, Datenmodell oder wesentlichen Entscheidungen müssen die betroffenen Dokumente aktualisiert werden.
