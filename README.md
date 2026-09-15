# StudyPrio

Intelligenter Aufgaben- und Deadline-Planer für Studierende im Modul WK_1106.

**Stand 15.09.2026:** Startgerüst und fachliche Entwürfe. Die Anwendung ist noch
nicht implementiert. Dokumentierte Funktionen sind geplantes Verhalten.

- [Arbeitsplan und fünf Arbeitspakete](docs/PLAN.md)
- [Spezifikation](docs/spec/README.md)
- [Prioritätsregeln](docs/spec/priority.md)
- [Architektur und ADRs](docs/arch/README.md)
- [Installation – Entwurf](INSTALL.md)
- [Team](TEAMINFO.md)

| Verzeichnis | Verantwortung |
|---|---|
| frontend/ | React/Vite: Anmeldung, Aufgaben, Dashboard, Gruppen |
| backend/ | Eigene Node.js-API: Tokenprüfung, Validierung, Rechte, Services |
| shared/ | Gemeinsame Fachlogik für Priorität und Validierung |
| tests/ | Integrations- und Abnahmetests; Unit-Tests neben Fachmodulen |
| docs/spec/ | Anforderungen, Daten, Dialoge, Abnahmekriterien |
| docs/arch/ | arc42 A01–A09 und A12, fünf vorgeschlagene ADRs |

JavaScript, React/Vite und Firebase entsprechen der angemeldeten Idee.
Die eigene API ist eine vorgeschlagene Ergänzung; das Team muss die ADRs prüfen.
Conventional Commits verwenden, Beiträge selbst prüfen und erklären, regelmäßig
nach main integrieren. KI-Unterstützung in Spec und Architektur offenlegen.

M3: **25.09.2026**, gepushter annotated Tag auf dem Default-Branch und
Abgabe-Mail durch die Projektleitung mit Repo, Tag, SHA und Mitgliederbestätigung.
Finalen Tag erst nach Abnahme setzen.

Quellen: [Kursvorgaben](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/README.md)
und [Bewertung](https://github.com/carstenlucke/thm_wkb_wk-1106/blob/main/BEWERTUNG.md).
