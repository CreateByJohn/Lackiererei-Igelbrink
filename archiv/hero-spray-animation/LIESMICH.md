# Spray-Animation im Hero der Startseite (archiviert in Runde 4)

Stand aus Commit `d3e4534` (Branch Feedback_Branch → Runde4_Branch). Seit Runde 4 zeigt der Hero das Original-Foto (Bild 138) ohne Animation.

## Was die Animation macht
Beim Laden der Startseite liegt eine dunkelblaue Deckfläche (Canvas `.hero__cover`, Farbe `--navy-deep`) über dem Hero-Foto.
Eine Spritzpistole (`02-hero-spraygun.svg`, `.hero__gun`) fährt in drei Zeilen über das Bild (links → rechts, rechts → links,
links → rechts) und „sprüht“ das Foto frei; ein zweites Canvas (`.hero__mist`) zeichnet den Sprühnebel. Dauer ca. 7,5 s.
Rein dekorativ (aria-hidden, keine pointer-events). Ohne JavaScript und bei `prefers-reduced-motion: reduce` ist das Foto sofort sichtbar.

## Dateien
- `hero-spray.js`: Skript (vorher `js/hero-spray.js`)
- `02-hero-spraygun.svg`: Spritzpistole (vorher `assets/img/02-hero-spraygun.svg`)
- `hero-spray.css`: entfernte CSS-Regeln aus `css/components.css` und benutzte Tokens
- `hero-markup.html`: altes Hero-Markup aus `index.html`

## Wieder einbauen
1. `hero-spray.js` nach `js/`, `02-hero-spraygun.svg` nach `assets/img/` zurücklegen.
2. Regeln aus `hero-spray.css` in `css/components.css` direkt unter `.hero__img` einfügen.
3. In `index.html` die drei Zeilen `<canvas class="hero__cover">`, `<canvas class="hero__mist">` und `<img class="hero__gun">`
   zwischen `</picture>` und `<div class="hero__body">` einsetzen (siehe `hero-markup.html`).
4. Am Ende von `index.html` `<script src="js/hero-spray.js?v=…" defer></script>` nach `main.js` ergänzen, `?v=` wie die übrigen Dateien.
5. Prüfen: `python3 tools/check-shared.py` (hero-spray.js darf nur auf der Startseite stehen).

Der Ordner `archiv/` wird nicht ausgeliefert: `_redirects` beantwortet `/archiv/*` mit 404.
