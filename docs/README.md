# Játékleírások - Game Specifications

Ez a mappa tartalmazza az Aventura Game teljes specifikációját.

## Fájlok

### game-specification-part1.txt
- Játék alapelve és működés
- Állapotmodell (inventory, currencies, stats, flags, puzzles)
- Döntési logika (feltételek és hatások)
- Feladatok és fejtörők
- Médiaelemek
- JSON példa és séma

### game-specification-part2.txt
- Teljes JSON Schema implementáció
- Játékállapot és perzisztencia
- Követelmény értékelés (RequirementExpr)
- Hatások végrehajtása (Effects)
- Puzzle motor részletei
- Renderer API kontrakt
- Teljes példa story JSON

## Főbb jellemzők

- **Interaktív történetmotor** csomópont-alapú struktúrával
- **Komplex feltételrendszer** (all_of, any_of, not logika)
- **9 féle puzzle típus**: mcq, text, regex, numeric, article_de, cloze_text, matching, ordering, hotspot
- **Dinamikus játékállapot**: inventory, currencies, stats, flags, timers
- **Hatás rendszer**: add/remove items, currency, stats, flags, loot_table, timer, goto
- **Média integráció**: képek, videók, hangok
- **Mentés/betöltés támogatás**

## Implementáció

A specifikáció teljes mértékben implementálható, minden fontos elem le van írva:
- JSON Schema validáció
- Állapotkezelés
- Logikai kiértékelés
- Puzzle értékelés
- Renderer API

---

**FONTOS**: Ezek a specifikációk adják meg a játék teljes működését.
Minden fejlesztésnek ezt kell alapul vennie!
