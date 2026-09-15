# ADR-004: Separate deterministische Priorisierung

Datum: 15.09.2026. **Status: vorgeschlagen**, fachliche/technische Teamprüfung offen.

## Kontext

Score hängt von Zeit ab und muss für UC-04 verständlich und testbar sein.

## Alternativen

Formel in React; gespeicherter Score; reine gemeinsame Funktion mit now.

## Entscheidungsvorschlag

Reine Funktion im shared-Paket mit explizitem now, PRIO-01 und stabiler Sortierung.

## Begründung

Feste Testzeiten und nachvollziehbare Beiträge; kein gespeicherter Score, der veraltet.

## Konsequenzen

UI muss regelmäßig aktualisieren; Gewichte sind Heuristik und benötigen Teamprüfung. Keine behauptete empirische Lernoptimierung.

## Prüfung vor Bestätigung

Amin stimmt den Vorschlag mit dem Team ab, prüft ihn am laufenden Setup und
aktualisiert Status/Datum. Bestehende Idee und tatsächlichen Code abgleichen.
