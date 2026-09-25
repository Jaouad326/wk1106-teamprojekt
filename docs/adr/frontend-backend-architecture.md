# ADR: Trennung von React-Frontend und Express-Backend

**Status:** umgesetzt  
**Datum:** 25.09.2026

## Kontext
StudyPrio benötigt interaktive UI und serverseitige Geschäftsregeln. Priorität und Berechtigungen dürfen nicht allein vom Browser abhängen.

## Alternativen
1. React + Express JSON-API.
2. Serverseitig gerenderte Monolith-UI.
3. Clientseitige Anwendung mit direktem Datenbankzugriff.

## Entscheidung
React/Vite bildet die Oberfläche. Express stellt JSON bereit. Services und Repositories bleiben im Backend.

## Begründung
Die Trennung ermöglicht serverseitige Validierung/Autorisierung, isolierte Tests und klare Bausteingrenzen.

## Konsequenzen
Positiv: klare Schnittstelle, Testbarkeit, unabhängige UI-Weiterentwicklung. Negativ: zusätzlicher HTTP-Datenfluss und zwei Entwicklungs-/Buildprozesse.

## Nachweis
frontend/src/api.js, frontend/src/features/*, backend/src/app.js und backend/src/modules/*.
