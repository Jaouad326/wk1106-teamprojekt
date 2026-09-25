# Architektur: Gruppen und Zugriffsrechte

## 1. Überblick

Die Gruppenfunktion besteht aus mehreren Backend-Komponenten und einer
Frontend-Anbindung.

Die zentrale Aufgabe der Gruppenarchitektur ist die Trennung von:

1. Gruppenverwaltung,
2. Gruppenmitgliedschaften,
3. Einladungen,
4. Zugriffsprüfung auf Gruppenaufgaben.

Eine Einladung führt erst nach erfolgreicher Annahme zu einer tatsächlichen
Mitgliedschaft.

Die Tabelle `group_members` bleibt deshalb die maßgebliche Quelle für die
aktuelle Zugriffsberechtigung.

## 2. Backend-Komponenten

### 2.1 Group Migration

Datei:

`backend/src/modules/groups/groupMigration.js`

Die Migration erstellt die Tabellen für Gruppen, Gruppenmitgliedschaften und
Gruppeneinladungen.

Die bestehende Benutzerverwaltung des Authentifizierungsmoduls wird verwendet.
Es wird keine zweite Benutzertabelle für Gruppen angelegt.

Für Einladungen wird die Tabelle `group_invitations` verwendet.

Sie enthält:

- `id`
- `groupId`
- `invitedUserId`
- `invitedBy`
- `status`
- `createdAt`
- `respondedAt`

Die Fremdschlüssel verweisen auf die vorhandenen Tabellen für Gruppen und
Benutzer.

## 3. Group Service

Datei:

`backend/src/modules/groups/groupService.js`

Der Group Service kapselt die eigentliche Gruppenverwaltung.

Zu seinen Aufgaben gehören insbesondere:

- Gruppen erstellen,
- eigene Gruppen auflisten,
- Gruppenmitglieder auflisten,
- Mitglieder entfernen,
- Berechtigungen des Owners bei Verwaltungsoperationen prüfen.

Der Service verwendet `userDirectory`, um Benutzer anhand ihrer E-Mail-Adresse
aufzulösen.

## 4. Group Invitation Service

Datei:

`backend/src/modules/groups/groupInvitationService.js`

Der Group Invitation Service kapselt den Lebenszyklus einer
Gruppeneinladung.

### Einladung erstellen

Beim Erstellen einer Einladung prüft der Service:

1. Die Gruppe existiert.
2. Der aktuelle Benutzer ist Owner.
3. Die E-Mail-Adresse wird normalisiert.
4. Der Benutzer existiert und ist bestätigt.
5. Der Benutzer ist noch kein Gruppenmitglied.
6. Es existiert keine andere offene Einladung für denselben Benutzer.

Danach wird eine neue Einladung mit dem Status `pending` gespeichert.

### Einladung anzeigen

Der Service lädt die Einladungen anhand von `invitedUserId`.

Dadurch kann ein Benutzer nur seine eigenen Einladungen sehen.

### Einladung annehmen

Beim Annehmen wird die Operation innerhalb einer Transaktion durchgeführt.

Der Ablauf ist:

```text
Benutzer
   |
   v
acceptInvitation()
   |
   v
Einladung prüfen
   |
   +-- gehört sie dem Benutzer?
   |
   +-- Status = pending?
   |
   v
group_members
   |
   v
Einladung auf accepted setzen