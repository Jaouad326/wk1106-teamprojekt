# Amin: Aufgabenverwaltung verstehen und erklären

Lies jeweils die genannten Funktionen und beantworte die Frage zunächst ohne die
Antwort. Du sollst die Umsetzung selbst prüfen; KI-Unterstützung ist offengelegt.

## 1. Der Weg einer neuen Aufgabe

`TaskForm` sammelt Eingaben. `prepareTaskPayload` gibt frühes Feedback und wandelt
die lokale Uhrzeit in UTC um. `createTaskApi` delegiert den Request an Jaouads Client.
Auf dem Server prüft dessen Sitzungsmiddleware den Benutzer. `TaskRouter` ruft
`TaskService.create` auf. Der Service validiert unabhängig vom Browser, prüft die
Gruppe und speichert über das Repository. Erst nach COMMIT erscheint ein Erfolg.

**Frage:** Warum darf `ownerId` nicht aus dem Formular kommen?

**Antwort:** Ein Benutzer könnte den HTTP-Request manipulieren und eine fremde ID
senden. Deshalb setzt der Server die ID aus der tatsächlich geprüften Sitzung.
Selbst ein zusätzlich übermitteltes `ownerId` wird als unzulässiges Feld abgewiesen.

## 2. SQL-Modell und Migration

`taskMigration.js` enthält eine Zeile pro Aufgabe. Die UUID ist der Primärschlüssel.
`ownerId` zeigt auf `users`, `groupId` entweder auf `groups` oder ist `NULL`.
`status` hat drei erlaubte Werte. CHECK-Bedingungen beschränken Zahlen und Texte
auch bei direktem SQL. Fachliche Kalenderprüfung bleibt im Service.

**Frage:** Warum legen wir im Task-Modul nicht einfach fehlende Nutzer-/Gruppentabellen an?

**Antwort:** Das wären konkurrierende Modelle der anderen Teammitglieder. Amins
Migration verlangt deren echte Tabellen und nennt fehlende Voraussetzungen klar.
Nur die isolierten Tests legen ausdrücklich fiktive Fremdtabellen an.

## 3. Validierung an zwei Stellen

Die Browserprüfung hilft bei Eingabefehlern, ist aber umgehbar. `taskValidation.js`
prüft jedes API-Payload erneut. `Number.isFinite` verhindert NaN/Infinity; Integer-
Prüfungen verhindern z.B. Schwierigkeit 2,5. Ein bloßes `Date.parse` reicht nicht,
weil manche unmöglichen Kalenderdaten automatisch in den Folgemonat umgerechnet werden.
Deshalb werden Monat, Tag und Schaltjahr zuvor geprüft.

**Frage:** Weshalb ist `"3"` bei Wichtigkeit ungültig, obwohl im Formular eine 3 steht?

**Antwort:** JSON soll hier eine Zahl enthalten, keinen Text. Der Browser wandelt
sein Eingabefeld vor dem Versand explizit um. Der Server errät keine Datentypen.

## 4. Eigentümer ist nicht automatisch Gruppenberechtigter

Für persönliche Aufgaben zählt allein der Eigentümer. Für Gruppenaufgaben wird
die aktuelle Mitgliedschaft zusätzlich zu `canReadTask/canWriteTask` abgewartet.
Ein früherer Ersteller kann nach seinem Austritt nicht weiterlesen oder löschen.
`listVisible/getVisibleById` wenden dieselben Regeln auch für Dashboard/Details an.

**Frage:** Was wäre an `if (!accessService.canWriteTask(...))` ohne `await` falsch?

**Antwort:** Eine asynchrone Methode liefert zunächst ein Promise. Dieses Objekt ist
truthy, selbst wenn es später `false` liefert. Die Prüfung könnte dadurch unberechtigte
Schreibzugriffe erlauben. Der Service wartet das Ergebnis ab und verlangt exakt `true`.

## 5. Löschkaskade

Ahshans Kommentare besitzen einen FK auf die Task mit `ON DELETE CASCADE`. Amins
DELETE entfernt die Task. SQLite entfernt dabei die zugehörigen Kommentare in derselben
Operation. Das klappt nur, wenn `PRAGMA foreign_keys = ON` in der jeweiligen Verbindung
aktiv ist. Genau das erzwingt das Repository und prüft ein Test mit zwei Aufgaben.

**Frage:** Warum nicht erst Kommentare und danach die Aufgabe per getrennten Requests löschen?

**Antwort:** Zwischen den Requests könnte ein Fehler auftreten. Die Datenbankkaskade
hält beides zusammen: entweder wird die Löschung bestätigt oder zurückgerollt.

## 6. Gleichzeitige Änderungen

`BEGIN IMMEDIATE` reserviert vor Rechteprüfung und Lesen den SQLite-Schreibzugriff.
Die neue Feldänderung wird auf den dann aktuellen Datensatz angewendet. Die Oberfläche
sendet nur tatsächlich geänderte Felder. Zwei Änderungen desselben Feldes erkennen
wir nicht als Versionskonflikt: Der letzte erfolgreiche Schreibzugriff gewinnt.
Haizams Rechteprüfung darf unter dieser Reservierung nur lesen, nicht selbst schreiben.

**Frage:** Was passiert, wenn ein anderer Vorgang die Datenbank länger sperrt?

**Antwort:** Nach dem Busy-Timeout von fünf Sekunden wird ein strukturierter 503-
Fehler zurückgegeben. Das Formular meldet keinen Erfolg und behält seine Eingaben.

## 7. Zusammenspiel mit dem Team

- Jaouad: Sitzung/CSRF bleiben bei ihm; DELETE braucht `{}` als JSON für seinen Schutz.
- Haizam: liefert echte Gruppen und asynchrone Zugriffsentscheidungen auf Task-Objekten.
- Bassim: liest sichtbare Tasks und berechnet den Score; Amin hat keine zweite Formel.
- Ahshan: erhält geprüfte Task-Details; sein Kommentarschema liefert die Löschkaskade.

**Frage:** Was beweisen unsere Tests noch nicht?

**Antwort:** Echten E-Mail-Versand und die vollständige gemeinsame App-/Dashboard-/
Kommentar-Montage. Seit 24.09. prüfen zusätzliche Tests echte Auth- und Gruppenmodule
sowie AuthGate mit Amins Aufgabenoberfläche. Der Mailtransport und die Konten sind
weiterhin Testdaten; der Prüfaufbau verändert nicht den gemeinsamen Root-Start.
Ein erfolgreicher Build allein wäre kein Beweis für korrekte Abläufe.

## 8. Änderungen während einer offenen Neuanlage

**Frage:** Warum darf ein verschwundener Gruppeneintrag nicht einfach wie
„Persönliche Aufgabe“ aussehen?

**Antwort:** Die Auswahl im Formularzustand kann noch auf die alte Gruppe zeigen.
Der Server würde die Speicherung verweigern; die Anzeige wäre irreführend. Deshalb
bleibt die alte Auswahl als ungültig erkennbar. Erst eine ausdrückliche neue Auswahl
ändert die Zuordnung. Gruppenladefehler lassen persönliche Aufgaben weiter zu.

## Kleine eigene Abnahme

Starte die Testansicht. Lege eine Aufgabe an, lade neu, ändere nur den Status, filtere
erledigte Aufgaben, brich einmal das Löschen ab und bestätige es danach. Lies im
Code für jeden Schritt die drei passenden Stellen: UI → Service → Repository.
Erkläre danach TASK-04 anhand des Sequenzdiagramms ohne abzulesen.
