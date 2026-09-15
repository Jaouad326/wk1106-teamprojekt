# PRIO-01: Priorisierung

**Vorschlag, noch nicht implementiert.** Bassim prüft die Gewichtung mit dem Team.
Eingaben: gültige Taskfelder aus D2 und ausdrücklich übergebener Zeitpunkt now.

## Formel

hoursLeft = (dueAt - now) / 3.600.000, Zeitwerte in Millisekunden.
clamp begrenzt auf 0–1.

- Dringlichkeit U = clamp(1 - max(hoursLeft, 0) / 168).
- Wichtigkeit I = (importance - 1) / 4.
- Schwierigkeit D = (difficulty - 1) / 4.
- Arbeitsdruck W = clamp(effortHours / max(hoursLeft, 1)).
- score = 50*U + 25*I + 15*D + 10*W; auf zwei Nachkommastellen runden.

Eine Woche Vorlauf; Wichtigkeit wiegt stärker als Schwierigkeit. Mehr Aufwand bei
gleicher Restzeit erhöht Arbeitsdruck. Gewichte sind eine Produktentscheidung,
keine empirisch bewiesene Lernoptimierung. UI erklärt die vier Beiträge.
Beispiel: 24 h Restzeit, importance=5, difficulty=3, effortHours=6:
U=6/7, I=1, D=0,5, W=0,25 → **77,86**.

## Sortierung und Zeit

Erledigte Tasks aus aktiver Liste entfernen. Überfällige (dueAt < now) vor
nicht überfälligen. Innerhalb beider Mengen: gerundeter Score absteigend,
Deadline aufsteigend, ID lexikografisch aufsteigend. Exakt jetzt fällig
ist noch nicht überfällig. Gleiche Tasks haben eine stabile Reihenfolge.
Beim Laden, nach Änderung und alle 60 Sekunden neu berechnen; pro Liste ein
gemeinsamer now. Keine veraltenden Scores speichern.

## Tests

Feste Zeit: Beispielscore; 168 h/24 h/exakt jetzt; überfällige zuerst; erledigte
ausgeschlossen; Score-/Deadline-/ID-Gleichstände. Steigende Wichtigkeit,
Schwierigkeit oder Aufwand senken den Score bei sonst gleichen Werten nicht.
Ungültige Daten (Datum, NaN, Infinity, Werte außerhalb D2) zurückweisen.
