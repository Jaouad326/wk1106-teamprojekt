# Entscheidung: Anmeldung per E-Mail-Link

Status: umgesetzt im Auth-Branch, echter Versand noch zu prüfen.
Datum: 23.09.2026.

## Ausgangslage

StudyPrio soll eine eigene Backend-Logik erhalten. Die Gruppe möchte Hochschul-
E-Mail-Adressen nutzen, hat aber keine freigeschaltete THM-SSO-Anbindung.
Für die kurze Projektlaufzeit brauchen wir einen überschaubaren Ablauf.

## Alternativen

- Firebase Auth: wenig eigener Aufwand, lagert wesentliche Auth-Arbeit aus.
- Eigene Passwörter: Passwortspeicherung und Wiederherstellung kommen hinzu.
- THM-SSO: setzt eine tatsächlich verfügbare Anbindung voraus.
- E-Mail-Link: benötigt Mailversand, aber keine Nutzerpasswörter.

## Entscheidung und Begründung

Wir verwenden kurzlebige Einmal-Links und eigene Sitzungen in SQLite.
Express prüft Eingaben, Linkgültigkeit, Sitzung und Ratenlimits selbst.
Nodemailer übernimmt nur das SMTP-Protokoll. Das passt zum vorhandenen
Express-/SQLite-Grundgerüst und vermeidet die Speicherung von Passwörtern.

## Folgen

Ein Versandkonto und eine erlaubte Domainliste müssen eingerichtet werden.
Mailboxzugriff beweist keinen Studierendenstatus; dies ist kein offizieller Uni-SSO.
Für lokale Tests gibt es einen gekennzeichneten Modus ohne echten Mailversand.
Sicherheit und Betrieb der Sitzung liegen bei unserem Backend.
