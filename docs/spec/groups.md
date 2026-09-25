# Spezifikation: Gruppen und gemeinsame Aufgaben

## Zweck

StudyPrio ermöglicht es Benutzerinnen und Benutzern, Gruppen zu erstellen und
mit anderen bestätigten Benutzerinnen und Benutzern gemeinsam Aufgaben zu
bearbeiten.

Eine Gruppe besteht aus einem Besitzer (Owner) und ihren Mitgliedern.
Der Zugriff auf Gruppenaufgaben richtet sich nach der aktuellen
Gruppenmitgliedschaft.

Neue Mitglieder werden nicht mehr direkt hinzugefügt. Stattdessen erstellt der
Gruppenbesitzer eine Einladung für einen bestätigten Benutzer. Erst nach
Annahme der Einladung entsteht eine tatsächliche Gruppenmitgliedschaft.

## Anwendungsfälle

### UC-G1: Gruppe erstellen

**Akteur:** angemeldeter Benutzer

Ein angemeldeter Benutzer erstellt eine neue Gruppe mit einem Namen.

Nach erfolgreicher Erstellung:

- wird die Gruppe gespeichert,
- der Ersteller wird als Owner der Gruppe eingetragen,
- der Ersteller wird gleichzeitig Mitglied der Gruppe.

### UC-G2: Gruppen anzeigen

**Akteur:** angemeldeter Benutzer

Ein Benutzer kann die Gruppen anzeigen, in denen er Mitglied ist.

Gruppen, in denen der Benutzer kein Mitglied ist, werden nicht angezeigt.

### UC-G3: Gruppenmitglieder anzeigen

**Akteur:** angemeldeter Benutzer

Ein Benutzer kann die Mitglieder einer Gruppe anzeigen, wenn er selbst
Mitglied dieser Gruppe ist.

Nichtmitglieder erhalten keinen Zugriff auf die Mitgliederliste.

### UC-G4: Mitglied aus Gruppe entfernen

**Akteur:** Gruppen-Owner

Der Owner kann ein anderes Mitglied aus der Gruppe entfernen.

Der Owner kann sich nicht selbst entfernen.

Nach der Entfernung besitzt der entfernte Benutzer keine
Gruppenmitgliedschaft mehr und verliert damit auch den Zugriff auf
Gruppenaufgaben dieser Gruppe.

### UC-G5: Gruppeneinladung erstellen

**Akteur:** Gruppen-Owner

Der Owner gibt die E-Mail-Adresse eines bestätigten Benutzers an und erstellt
eine Einladung.

Dabei gelten folgende Regeln:

- Nur der Owner darf Einladungen erstellen.
- Die eingeladene E-Mail-Adresse muss zu einem bestätigten Benutzerkonto
  gehören.
- Ein bereits vorhandenes Gruppenmitglied kann nicht erneut eingeladen werden.
- Für denselben Benutzer darf nicht gleichzeitig eine weitere offene
  Einladung bestehen.

Eine erstellte Einladung hat zunächst den Status `pending`.

Eine offene Einladung erzeugt noch keine Gruppenmitgliedschaft.

### UC-G6: Eigene Einladungen anzeigen

**Akteur:** eingeladener Benutzer

Ein eingeladener Benutzer sieht seine offenen Einladungen unter der Glocke im Dashboard.

Für jede Einladung werden unter anderem Gruppe, Einladungsstatus und
Erstellungszeitpunkt angezeigt.

Nur Einladungen, die an den aktuell angemeldeten Benutzer gerichtet sind,
werden zurückgegeben.

### UC-G7: Gruppeneinladung annehmen

**Akteur:** eingeladener Benutzer

Der eingeladene Benutzer kann eine offene Einladung annehmen.

Beim Annehmen:

1. wird geprüft, ob die Einladung dem aktuellen Benutzer gehört,
2. wird geprüft, ob die Einladung noch den Status `pending` besitzt,
3. wird der Benutzer als Mitglied in `group_members` eingetragen,
4. wird die Einladung auf `accepted` gesetzt,
5. wird der Antwortzeitpunkt gespeichert.

Eine bereits beantwortete Einladung kann nicht erneut angenommen werden.

### UC-G8: Gruppeneinladung ablehnen

**Akteur:** eingeladener Benutzer

Der eingeladene Benutzer kann eine offene Einladung ablehnen.

Beim Ablehnen:

- wird keine Gruppenmitgliedschaft erzeugt,
- wird die Einladung auf `declined` gesetzt,
- wird der Antwortzeitpunkt gespeichert.

Eine bereits beantwortete Einladung kann nicht erneut abgelehnt werden.

### UC-G9: Zugriff auf Gruppenaufgaben

**Akteur:** Gruppenmitglied

Ein Benutzer darf auf Aufgaben einer Gruppe zugreifen, wenn er aktuell
Mitglied dieser Gruppe ist.

Die aktuelle Mitgliedschaft wird bei der Zugriffsprüfung aus der
Gruppenmitgliedschaft ermittelt.

Wird ein Benutzer aus einer Gruppe entfernt, verliert er bei folgenden
Zugriffsprüfungen den Zugriff auf deren Gruppenaufgaben.

Persönliche Aufgaben sind nicht Bestandteil einer Gruppe und unterliegen
weiterhin der persönlichen Besitzerprüfung.

### UC-G10: Gruppe verlassen

**Akteur:** Gruppenmitglied

Ein normales Gruppenmitglied kann die eigene Mitgliedschaft in einer Gruppe
beenden.

Beim Verlassen:

- wird der eigene Eintrag aus `group_members` entfernt,
- bleibt die Gruppe selbst bestehen,
- verliert der Benutzer den Zugriff auf die Gruppenaufgaben dieser Gruppe,
- wird die Gruppe anschließend nicht mehr in seinen eigenen Gruppen angezeigt.

Auch die Gruppenleitung kann nach Bestätigung austreten. Sind andere Mitglieder
vorhanden, muss sie eines davon als Nachfolger wählen. Ist sie allein, wird die
Gruppe aufgelöst: Gruppenaufgaben werden zu persönlichen Aufgaben des letzten
Mitglieds; ihre Kommentare bleiben erhalten. Offene Einladungen verfallen.

## Daten

### Gruppe

Eine Gruppe besitzt insbesondere:

- `id`
- `name`
- `ownerId`

Der `ownerId` verweist auf den Benutzer, der die Gruppe erstellt hat und die
Mitgliederverwaltung durchführen darf.

### Gruppenmitgliedschaft

Die tatsächliche Mitgliedschaft wird in `group_members` gespeichert.

Eine Mitgliedschaft verbindet:

- einen Benutzer (`userId`)
- mit einer Gruppe (`groupId`)

Die Tabelle `group_members` ist die maßgebliche Quelle dafür, ob ein Benutzer
aktuell Mitglied einer Gruppe ist.

### Gruppeneinladung

Einladungen werden in `group_invitations` gespeichert.

Eine Einladung enthält insbesondere:

- `id`
- `groupId`
- `invitedUserId`
- `invitedBy`
- `status`
- `createdAt`
- `respondedAt`

Für `status` sind die Werte `pending`, `accepted` und `declined` vorgesehen.

Eine Einladung mit dem Status `pending` stellt noch keine
Gruppenmitgliedschaft dar.

Beim Annehmen einer Einladung wird zusätzlich ein Eintrag in
`group_members` erzeugt.

## Berechtigungen

### Owner

Der Owner darf:

- die Gruppe erstellen,
- Einladungen für bestätigte Benutzer erstellen,
- Gruppenmitglieder anzeigen,
- Mitglieder entfernen.

Direktes Entfernen der Gruppenleitung bleibt verboten. Für den Austritt gilt UC-G10.

### Gruppenmitglied

Ein Gruppenmitglied darf:

- die eigene Gruppe anzeigen,
- die Gruppenmitglieder anzeigen,
- auf Aufgaben der Gruppe zugreifen.
- die eigene Mitgliedschaft beenden.

### Eingeladener Benutzer

Ein eingeladener Benutzer darf:

- eigene offene Einladungen anzeigen,
- eigene Einladungen annehmen,
- eigene Einladungen ablehnen.

Eine Einladung allein gewährt noch keinen Zugriff auf Gruppenaufgaben.

### Nichtmitglied

Ein Nichtmitglied darf nicht:

- die geschützten Gruppeninhalte einer Gruppe anzeigen,
- Gruppenmitglieder einer fremden Gruppe anzeigen,
- auf Gruppenaufgaben dieser Gruppe zugreifen.

## API

Die Gruppenfunktionalität wird über folgende Endpunkte bereitgestellt:

| Methode | Endpunkt | Zweck |
| --- | --- | --- |
| GET | `/api/groups` | Eigene Gruppen anzeigen |
| POST | `/api/groups` | Gruppe erstellen |
| GET | `/api/groups/:groupId/members` | Gruppenmitglieder anzeigen |
| DELETE | `/api/groups/:groupId/members/:userId` | Mitglied entfernen |
| DELETE | `/api/groups/:groupId/membership` | Eigene Gruppenmitgliedschaft beenden |
| GET | `/api/groups/invitations` | Eigene Einladungen anzeigen |
| POST | `/api/groups/:groupId/invitations` | Einladung erstellen |
| POST | `/api/groups/invitations/:invitationId/accept` | Einladung annehmen |
| POST | `/api/groups/invitations/:invitationId/decline` | Einladung ablehnen |

Die Endpunkte sind durch die Authentifizierung geschützt.

## Fehlerfälle

Typische Fehlerfälle sind:

- Gruppe existiert nicht.
- Benutzer ist nicht angemeldet.
- Benutzer ist nicht Mitglied der Gruppe.
- Benutzer ist nicht der Owner.
- eingeladene E-Mail-Adresse gehört keinem bestätigten Benutzer.
- Benutzer ist bereits Mitglied.
- Für den Benutzer existiert bereits eine offene Einladung.
- Einladung existiert nicht.
- Einladung gehört nicht zum angemeldeten Benutzer.
- Einladung wurde bereits beantwortet.
- Gruppenleitung wählt beim Verlassen keinen gültigen Nachfolger.
- Benutzer versucht, eine Gruppe zu verlassen, in der er kein Mitglied ist.

## Abgrenzung

Die Gruppenfunktion verwaltet Gruppen, Mitgliedschaften, Einladungen und die
dazugehörige Zugriffsprüfung.

Die eigentliche Aufgabenverwaltung bleibt im Aufgabenmodul.

Die Benutzerkonten und deren Bestätigungsstatus werden vom Authentifizierungs-
modul bereitgestellt und nicht erneut im Gruppenmodul angelegt.
## Oberfläche und Zustimmung (25.09.2026)

Das Formular „Einladen“ erstellt ausschließlich eine offene Einladung. Der alte
POST-Endpunkt /api/groups/:groupId/members erstellt ebenfalls nur eine Einladung.
Es gibt über die HTTP-API kein erzwungenes Hinzufügen. Einladungen erscheinen in
der App, nicht als zusätzliche E-Mail; der Empfänger braucht ein bestätigtes Konto.
Nach Annahme werden Gruppen und Aufgaben ohne Seitenneuladen aktualisiert.
Bereits bestehende Mitgliedschaften werden durch dieses Update nicht verändert.

KI-Unterstützung: ChatGPT/Codex für UI-Anschluss, Austrittsregeln und Tests.
Geprüft mit isolierter Datenbank und Browserkonten; keine echten Einladungsmails.
