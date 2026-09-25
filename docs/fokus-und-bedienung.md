# Fokusmodus und Bedienung – 25.09.2026

Lernzeit: 1–180 ganze Minuten; Pause: 1–60 ganze Minuten. Vorschläge sind 25/5,
50/10 und 90/15. „Zeiten übernehmen“ hält einen laufenden Timer an und beginnt
eine neue Lernphase mit dem gewählten Wert. Start, Pause und Zurücksetzen sind
getrennte Aktionen. Die verbleibende Zeit wird aus einer Uhrzeit berechnet, damit
ein gedrosselter Browser-Tab keine Sekundenschritte verliert. Nach Phasenende
wartet der Timer auf den nächsten Start; nur abgeschlossene Lernphasen werden gezählt.

Zeiten, Restzeit, Aufgabenauswahl und Zähler bleiben lokal in diesem Browser
(localStorage) erhalten. Nach einem Seitenneuladen steht der Timer auf Pause.
Er ist kein serverseitiger Timer und keine geräteübergreifende Zeiterfassung.

Logout und Gruppenaustritt verwenden einen nativen modalen Dialog mit
Tastaturfokus, Abbrechen und Bestätigen. Auswahlfelder und Buttons verwenden die
bestehenden Grün-/Grautöne, abgerundete Konturen sowie sichtbare Fokuszustände.

Prüfung: 62 Backendtests, 2 HTTP-Integrationstests und Vite-Build. Der zusätzliche
Browserlauf prüft zwei Konten, Logout-Abbruch und -Bestätigung, eigene Timerwerte
und Persistenz, Phasenwechsel, Einladungsablehnung/-annahme, Leitungswechsel,
Austritt des letzten Mitglieds sowie erhaltene Aufgaben und Desktop/Mobil.

Wiederholen (Playwright samt Chromium separat installiert):
`node backend/tests/integration/user-flows.browser.mjs`.
PLAYWRIGHT_MODULE und STUDYPRIO_CHROMIUM können externe Installationen angeben.
Testdatenbank und Testkonten sind temporär, Mailversand ist simuliert.

KI-Unterstützung: ChatGPT/Codex für Implementierung, Tests und Dokumentation.
