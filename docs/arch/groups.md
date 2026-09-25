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
- eigene Gruppenmitgliedschaft verlassen,
- Berechtigungen des Owners bei Verwaltungsoperationen prüfen.

Ein normales Gruppenmitglied kann seine eigene Mitgliedschaft über
`leaveGroup()` beenden.

Dabei wird der entsprechende Eintrag aus `group_members` gelöscht.
Die Gruppe selbst bleibt bestehen.

Der Gruppenbesitzer darf die Gruppe nicht über `leaveGroup()` verlassen.
Dies wird vom Service mit einem Fehler abgelehnt.


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

### Gruppe verlassen

Ein normales Gruppenmitglied kann die eigene Mitgliedschaft über den

Group Service beenden.

Der Ablauf ist:



Benutzer

   |

   v

DELETE /api/groups/:groupId/membership

   |

   v

groupRoutes.js

   |

   v

groupService.leaveGroup()

   |

   v

Mitgliedschaft prüfen

   |

   +-- Gruppe vorhanden?

   |

   +-- Benutzer ist Owner?

   |

   +-- Benutzer ist Mitglied?

   |

   v

DELETE aus group_members

   |

   v

Zugriff auf Gruppenaufgaben erlischt



Die Gruppe selbst wird dabei nicht gelöscht.

Nur der Eintrag des Benutzers in group_members wird entfernt.

Der Owner darf die Gruppe nicht verlassen. Ein entsprechender Versuch wird

vom Group Service abgelehnt.

Die Zugriffsprüfung verwendet weiterhin group_members als maßgebliche

Quelle für die aktuelle Mitgliedschaft.