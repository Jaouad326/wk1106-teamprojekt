# ADR-001: JavaScript und npm-Workspaces

Datum: 15.09.2026. **Status: vorgeschlagen**, fachliche/technische Teamprüfung offen.

## Kontext

Angemeldet ist JavaScript; weniger als zwei Wochen bis M3, fünf parallele Bereiche.

## Alternativen

JavaScript getrennt pro App; TypeScript-Monorepo; JavaScript-Workspaces.

## Entscheidungsvorschlag

JavaScript mit npm-Workspaces für frontend, backend und shared.

## Begründung

Kein kurzfristiger Sprachwechsel; eine Lockdatei und gemeinsame Fachmodule vereinfachen Integration.

## Konsequenzen

Weniger statische Typprüfung; verbindliche Runtime-Validierung nötig. Workspace-Verknüpfung und CI müssen praktisch geprüft werden.

## Prüfung vor Bestätigung

Amin stimmt den Vorschlag mit dem Team ab, prüft ihn am laufenden Setup und
aktualisiert Status/Datum. Bestehende Idee und tatsächlichen Code abgleichen.
