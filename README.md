# Aventura Game

Online kalandjáték - Interactive Fiction / Choose-Your-Own-Adventure

## Leírás

Ez egy lapozgatós kalandjáték (interactive fiction engine), ahol a játékos döntései befolyásolják a történet menetét. A játék csomópont-alapú történetstruktúrán alapul, komplex logikai feltételekkel, puzzle-ökkel és dinamikus állapotkezeléssel.

## Projekt Állapot

🚧 **Fejlesztés alatt** - A Claude Code webes verziója dolgozik a projekten

## Főbb Jellemzők

### Történetmotor
- Csomópont-alapú történetstruktúra
- Elágazó történetszálak döntések alapján
- Dinamikus feltételrendszer (all_of, any_of, not)
- Média integráció (képek, videók, hangok)

### Puzzle Típusok
- **mcq**: Feleletválasztós kérdések
- **text**: Szöveges válasz
- **regex**: Regex minta alapú
- **numeric**: Számítási feladatok
- **article_de**: Német névelő gyakorlás
- **cloze_text**: Hiányos mondatok kitöltése
- **matching**: Párosítás
- **ordering**: Sorrendbe rendezés
- **hotspot**: Képen történő kijelölés

### Játékállapot
- **Inventory**: Tárgyak gyűjtése és kezelése
- **Currencies**: Pénznemek (érmék, kristályok, stb.)
- **Stats**: Jellemzők (életerő, hírnév, korrupció)
- **Flags**: Logikai jelzők események nyilvántartására
- **Timers**: Időzített események

### Hatásrendszer
- Tárgy hozzáadás/elvétel
- Pénznem és stat módosítás
- Flag beállítás
- Véletlen zsákmány (loot_table)
- Azonnali ugrások (goto)
- Választások zárolása/feloldása

## Projekt Struktúra

```
aventura_game/
├── docs/              # Teljes játékspecifikáció
├── src/               # Forráskód (hamarosan)
├── stories/           # Történetek JSON formátumban
├── assets/            # Média fájlok
└── README.md
```

## Dokumentáció

A teljes játékspecifikáció a `docs/` mappában található:
- `game-specification-part1.txt` - Alapelvek, logika, példák
- `game-specification-part2.txt` - JSON Schema, implementációs részletek

## Technológiai Stack

TBD - A fejlesztés során kerül meghatározásra a webes Claude által

## Használat

**FONTOS**: Minden fejlesztésnek a `docs/` mappában található specifikációkat kell alapul vennie!

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
