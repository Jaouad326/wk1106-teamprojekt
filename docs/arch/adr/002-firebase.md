# ADR-002: Firebase Auth und Firestore

Datum: 15.09.2026. **Status: vorgeschlagen**, fachliche/technische Teamprüfung offen.

## Kontext

Firebase ist angemeldet, der Dozent warnt vor zu geringer eigener Backend-Logik.

## Alternativen

Firebase; eigene Auth mit SQL; Supabase/PostgreSQL.

## Entscheidungsvorschlag

Firebase für Identität und Speicherung; eigene Regeln in unserer API.

## Begründung

Behält die Idee bei und spart Kontoverwaltung, ohne Berechtigungen und Tasklogik auszulagern.

## Konsequenzen

Dienstbindung, privilegierter Adminzugriff, dokumentenorientierte Gruppenabfragen; keine relationalen Constraints. Eigene Rechte-/Konsistenztests nötig.

## Prüfung vor Bestätigung

Amin stimmt den Vorschlag mit dem Team ab, prüft ihn am laufenden Setup und
aktualisiert Status/Datum. Bestehende Idee und tatsächlichen Code abgleichen.
