# Entwicklung, Tests und Qualität

## Setup
Die vollständige Anleitung steht in INSTALL.md. Kurz: Repository klonen, Node.js bereitstellen, Abhängigkeiten installieren, .env anlegen, Migration ausführen und npm run dev starten.

## Struktur
frontend/src enthält API- und Feature-Code. backend/src/modules enthält Auth, Tasks, Groups und Comments. Backend folgt bei den fachlich geschichteten Modulen grundsätzlich Route → Service → Repository/Migration; der Kommentarbereich bildet dabei eine bewusst schlankere Route-/DB-Implementierung.

## Teststrategie
**Unit:** reine Fachlogik, insbesondere Prioritätsberechnung.  
**HTTP/Integration:** Router, Auth, Rechte, Persistenz und Transaktionen mit temporären Datenbanken.  
**Frontend:** Vite-Build und lokale Browserabläufe.  
**Mail:** getrennte local/smtp-Wege, TLS-/Transporttests und manueller Versandtest im Auth-Bereich.

## Befehle
- npm run dev
- npm run build
- npm run test:team
- npm run demo:team
- npm run check:auth
- npm --prefix backend test
- npm --prefix backend run migrate

## Git
Neue Änderungen verwenden Conventional Commits, z. B. feat(tasks): ..., fix(auth): ..., docs(architecture): ..., test(tasks): ... . Der eingereichte Tag v1.0.0 wird nicht rückwirkend verschoben.

## Dokumentationspflege
Use Case ändern → specification + traceability.  
Komponente ändern → architecture.  
Wesentliche Architekturentscheidung → ADR.  
Datenmodell ändern → Spezifikation/Architektur und Codepfade abgleichen.

## KI
Im Projekt wurden **ChatGPT Astra**, **Claude Sonnet 5** und **GPT-5.6 Terra** als Assistenz für Entwürfe, Implementierung, Tests und Dokumentation genutzt. Ausgaben wurden durch Code-/Dokumentenabgleich und Tests überprüft. Das Team bleibt für den resultierenden Code verantwortlich.
