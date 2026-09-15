# ADR-003: Eigene API als Datenzugriffsgrenze

Datum: 15.09.2026. **Status: vorgeschlagen**, fachliche/technische Teamprüfung offen.

## Kontext

UI-only-Firestore würde wesentliche Serverlogik auslagern; Gruppenrechte müssen verbindlich gelten.

## Alternativen

Direkte Browserzugriffe plus Security Rules; Cloud Functions; eigene Node.js/Express-API.

## Entscheidungsvorschlag

Browser nutzt Firebase Auth und unsere API; nur API liest/schreibt Firestore.

## Begründung

Tokenprüfung, Validierung und Task-/Gruppen-/Kommentarservices sind eigener nachvollziehbarer Code; lokal ohne Functions-Deployment möglich.

## Konsequenzen

Zusätzlicher Prozess und Hostingbedarf; jede Route braucht Rechteprüfung. Admin SDK umgeht Rules; direkte Clientzugriffe verweigern. API-Ausfall blockiert Aufgaben.

## Prüfung vor Bestätigung

Amin stimmt den Vorschlag mit dem Team ab, prüft ihn am laufenden Setup und
aktualisiert Status/Datum. Bestehende Idee und tatsächlichen Code abgleichen.
