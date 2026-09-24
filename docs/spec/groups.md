# Gruppen und gemeinsame Aufgaben

## Zweck

StudyPrio ermöglicht es Benutzerinnen und Benutzern, Gruppen zu erstellen und
weitere bestätigte Benutzer zu einer Gruppe hinzuzufügen.

Gruppen dienen dazu, Aufgaben gemeinsam zu bearbeiten. Der Zugriff auf
Gruppenaufgaben richtet sich nach der aktuellen Mitgliedschaft in der Gruppe.

## Anwendungsfälle

### UC-G1: Gruppe erstellen

Ein angemeldeter Benutzer erstellt eine neue Gruppe.

**Vorbedingung:**
- Der Benutzer ist angemeldet.
- Der Gruppenname ist zwischen 1 und 80 Zeichen lang.

**Ablauf:**
1. Der Benutzer gibt einen Gruppennamen ein.
2. Das Backend erstellt eine neue Gruppe.
3. Der erstellende Benutzer wird automatisch als Gruppenbesitzer eingetragen.
4. Der erstellende Benutzer wird automatisch Mitglied der Gruppe.

**Ergebnis:**
- Die Gruppe existiert.
- Der Ersteller ist Besitzer und Mitglied der Gruppe.

### UC-G2: Mitglied hinzufügen

Der Gruppenbesitzer fügt einen bestätigten Benutzer zu einer Gruppe hinzu.

**Vorbedingung:**
- Der Benutzer ist angemeldet.
- Der Benutzer ist Besitzer der Gruppe.
- Für die angegebene E-Mail-Adresse existiert ein bestätigtes Konto.

**Ergebnis:**
- Der Benutzer wird Mitglied der Gruppe.

### UC-G3: Mitglied entfernen

Der Gruppenbesitzer entfernt ein Mitglied aus der Gruppe.

**Vorbedingung:**
- Der Benutzer ist angemeldet.
- Der Benutzer ist Besitzer der Gruppe.
- Der zu entfernende Benutzer ist nicht der Besitzer.

**Ergebnis:**
- Die Mitgliedschaft wird entfernt.
- Der entfernte Benutzer hat bei der nächsten Zugriffsprüfung keinen
  Zugriff mehr auf Gruppenaufgaben dieser Gruppe.

### UC-G4: Eigene Gruppen anzeigen

Ein angemeldeter Benutzer kann die Gruppen anzeigen, in denen er Mitglied ist.

### UC-G5: Gruppenmitglieder anzeigen

Ein Mitglied einer Gruppe kann die Mitglieder dieser Gruppe anzeigen.

### UC-G6: Gruppenaufgaben zugreifen

Ein Mitglied einer Gruppe kann auf Aufgaben dieser Gruppe zugreifen.

Die aktuelle Mitgliedschaft entscheidet über den Zugriff. Wird ein Benutzer
aus der Gruppe entfernt, verliert er den Zugriff auf deren Gruppenaufgaben.

## Daten

### Gruppe

Eine Gruppe besitzt folgende Daten:

| Feld | Beschreibung |
|---|---|
| `id` | Eindeutige ID der Gruppe |
| `name` | Name der Gruppe |
| `ownerId` | ID des Gruppenbesitzers |
| `createdAt` | Erstellungszeitpunkt |
| `updatedAt` | Zeitpunkt der letzten Änderung |

### Gruppenmitgliedschaft

Eine Mitgliedschaft verbindet einen Benutzer mit einer Gruppe.

| Feld | Beschreibung |
|---|---|
| `groupId` | ID der Gruppe |
| `userId` | ID des Benutzers |

Die Kombination aus `groupId` und `userId` ist eindeutig.

## Berechtigungen

- Nur der Gruppenbesitzer darf Mitglieder hinzufügen.
- Nur der Gruppenbesitzer darf Mitglieder entfernen.
- Der Gruppenbesitzer kann sich nicht selbst aus der Gruppe entfernen.
- Nur Gruppenmitglieder können die Mitglieder einer Gruppe anzeigen.
- Der Zugriff auf eine Gruppenaufgabe wird anhand der aktuellen
  Gruppenmitgliedschaft geprüft.
- Persönliche Aufgaben gehören ausschließlich ihrem Besitzer.

## Fehlerfälle

Folgende Fälle werden vom Backend behandelt:

- ungültiger oder fehlender Gruppenname
- Gruppe nicht gefunden
- Benutzer ohne bestätigtes Konto
- Benutzer ist bereits Mitglied
- Benutzer ist kein Gruppenbesitzer
- Benutzer versucht, den Gruppenbesitzer zu entfernen
- Benutzer ist kein Mitglied der Gruppe

## Abgrenzung

Die eigentliche Authentifizierung eines Benutzers und die Verwaltung
bestätigter Benutzerkonten werden durch das Authentifizierungsmodul
bereitgestellt.

Die Gruppenfunktion verwendet diese Benutzerinformationen, ist aber nicht
für die Authentifizierung selbst verantwortlich.