#!/usr/bin/env python3
"""Prüft, ob Header, Info-Leiste, Footer und Kontaktformular-Dialog auf allen Seiten zeichengleich sind.

Verglichen werden die Blöcke zwischen den Markern
  <!-- HEADER --> … <!-- /HEADER -->
  <!-- INFO-LEISTE --> … <!-- /INFO-LEISTE -->
  <!-- FOOTER --> … <!-- /FOOTER -->
  <!-- DIALOG --> … <!-- /DIALOG -->
Erlaubter Unterschied: aria-current (aktiver Menüpunkt). Außerdem: gleiche ?v=-Nummer bei CSS und JS.
Das Skript baut nichts und ändert keine Datei, es meldet nur Abweichungen.

Aufruf im Projektordner:  python3 tools/check-shared.py
Rückgabewert 0 = alles gleich, 1 = Abweichungen gefunden."""
import difflib, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFERENZ = "index.html"
BLOECKE = ["HEADER", "INFO-LEISTE", "FOOTER", "DIALOG"]
NICHT_PRUEFEN = {"bilder-uebersicht.html"}   # Werkzeug-Seite, kein Teil der Website


def block(text, name):
    m = re.search(r"<!-- %s -->.*?<!-- /%s -->" % (re.escape(name), re.escape(name)), text, re.S)
    if not m:
        return None
    return re.sub(r'\s+aria-current="[^"]*"', "", m.group(0))


def versionen(text):
    return sorted(set(re.findall(r'(?:css|js)/[\w.-]+\?v=(\w+)', text)))


def main():
    os.chdir(ROOT)
    seiten = sorted(f for f in glob.glob("*.html") if f not in NICHT_PRUEFEN)
    ref = open(REFERENZ, encoding="utf-8").read()
    fehler = 0
    for name in BLOECKE:
        if block(ref, name) is None:
            print("FEHLT  %s: Block %s nicht gefunden" % (REFERENZ, name)); fehler += 1
    ref_v = versionen(ref)
    for seite in seiten:
        text = open(seite, encoding="utf-8").read()
        probleme = []
        for name in BLOECKE:
            a, b = block(ref, name), block(text, name)
            if b is None:
                probleme.append("Block %s fehlt" % name)
            elif a is not None and a != b:
                diff = difflib.unified_diff(a.splitlines(), b.splitlines(), REFERENZ, seite, n=0, lineterm="")
                probleme.append("Block %s weicht ab:\n    " % name + "\n    ".join(list(diff)[2:12]))
        if versionen(text) != ref_v:
            probleme.append("?v= %s statt %s" % (versionen(text), ref_v))
        if 'src="js/main.js' not in text:
            probleme.append("js/main.js fehlt")
        if seite != REFERENZ and "hero-spray.js" in text:
            probleme.append("hero-spray.js gehört nur auf die Startseite")
        if probleme:
            fehler += 1
            print("ABWEICHUNG  %s" % seite)
            for p in probleme:
                print("  - " + p)
        else:
            print("ok         %s" % seite)
    print()
    print("%d Seiten geprüft, %s" % (len(seiten), "keine Abweichungen." if not fehler else "%d mit Abweichungen." % fehler))
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
