# ADR-005: Emulatoren für reproduzierbare lokale Abnahme

Datum: 15.09.2026. **Status: vorgeschlagen**, fachliche/technische Teamprüfung offen.

## Kontext

Prüfung muss ohne verteilte geheime Zugangsdaten und ohne bezahlte Functions funktionieren.

## Alternativen

Nur reales Firebase-Projekt; lokale Emulatoren; vollständig eigenes lokales Backend mit SQL.

## Entscheidungsvorschlag

Auth-/Firestore-Emulatoren als lokaler Einstieg plus eigene API/Vite.

## Begründung

Mehrere Testkonten und Rechtefälle isoliert prüfbar; vorhandenen Stack beibehalten.

## Konsequenzen

Zusätzliche Java-Runtime, mehrere Prozesse, Emulator/Produktion unterscheiden sich. Tatsächliche Installation und Produktionskonfiguration bleiben zu prüfen; Hosting noch offen.

## Prüfung vor Bestätigung

Amin stimmt den Vorschlag mit dem Team ab, prüft ihn am laufenden Setup und
aktualisiert Status/Datum. Bestehende Idee und tatsächlichen Code abgleichen.
