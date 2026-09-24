# Architektur: Gruppen und Zugriffsrechte

## 1. Überblick

Die Gruppenfunktion besteht aus drei wesentlichen Teilen:

- Gruppenverwaltung im Backend
- Persistenz von Gruppen und Mitgliedschaften in SQLite
- zentrale Prüfung von Zugriffsrechten über den `AccessService`

Die Gruppenverwaltung wird über eine REST-API bereitgestellt.

## 2. Backend-Komponenten

### Group Migration

Die Migration `groupMigration.js` legt zwei Tabellen an:

- `groups`
- `group_members`

Die Tabelle `group_members` verwendet die Kombination aus
`groupId` und `userId` als Primärschlüssel. Dadurch kann ein Benutzer nicht
mehrfach Mitglied derselben Gruppe sein.

### Group Service

Der `groupService` enthält die fachliche Logik der Gruppenverwaltung.

Er übernimmt unter anderem:

- Erstellen von Gruppen
- automatisches Anlegen der Besitzer-Mitgliedschaft
- Hinzufügen von Mitgliedern
- Entfernen von Mitgliedern
- Auflisten eigener Gruppen
- Abrufen einer Gruppe
- Auflisten der Gruppenmitglieder

Der Service verwendet ein `userDirectory`, um beim Hinzufügen eines
Mitglieds ein bestätigtes Benutzerkonto anhand der E-Mail-Adresse zu suchen.

### Group Router

Der `groupRouter` stellt die Gruppenfunktionen als HTTP-Endpunkte bereit.

Die Routen verwenden `requireAuth`, sodass die Identität des angemeldeten
Benutzers aus der Authentifizierung übernommen wird.

Der Router übergibt die fachliche Verarbeitung an den `groupService`.

## 3. Datenmodell

Die Beziehung zwischen Gruppen und Benutzern wird über die
Zwischentabelle `group_members` abgebildet.