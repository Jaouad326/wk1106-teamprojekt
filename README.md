# StudyPrio

Teamprojekt für WK_1106 Wirtschaftsinformatik-Projekt I an der THM.
StudyPrio soll Studienaufgaben anhand von Deadline, Wichtigkeit, Schwierigkeit
und Aufwand priorisieren und gemeinsame Aufgaben mit Gruppen und Kommentaren unterstützen.

Dieser Arbeitsstand enthält den geprüften Anmeldebereich. Eine separate lokale
Demo verbindet ihn mit Aufgaben und Gruppen; die vollständige Zusammenführung
einschließlich Kommentare und Dashboard steht noch aus.

- [Installation und Start](INSTALL.md)
- [Team und Projektidee](TEAMINFO.md)
- [Spezifikation der Anmeldung](docs/spec/auth.md)
- [Architektur der Anmeldung](docs/arch/auth.md)
- [Team-Demo und Anschluss der Module](docs/auth-integration.md)
- [Auth-Abschlussprüfung und Code-Erklärung](docs/auth-abschluss.md)

Stack: React/Vite, Express und SQLite. Anmeldung über einen E-Mail-Einmallink
mit eigener Sitzung. Für lokalen Testbetrieb ist kein Mailkonto nötig; echter
Mailversand benötigt ein konfiguriertes SMTP-Konto. Kein offizieller THM-SSO.
