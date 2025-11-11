# Aventura Game

Online kalandjáték - Interactive Fiction / Choose-Your-Own-Adventure

## Leírás

Ez egy lapozgatós kalandjáték (interactive fiction engine), ahol a játékos döntései befolyásolják a történet menetét. A játék csomópont-alapú történetstruktúrán alapul, komplex logikai feltételekkel, puzzle-ökkel és dinamikus állapotkezeléssel.

## Projekt Állapot

✅ **Core Engine Implemented** - A teljes játékmotor készen áll!

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
├── src/               # TypeScript forráskód
│   ├── core/          # Type definitions
│   ├── engine/        # Game engine, state, effects, puzzles
│   ├── examples/      # Console player example
│   └── index.ts       # Main export
├── stories/           # Történetek JSON formátumban
│   └── demo.json      # Példa történet
├── assets/            # Média fájlok
├── package.json
├── tsconfig.json
└── README.md
```

## Dokumentáció

A teljes játékspecifikáció a `docs/` mappában található:
- `game-specification-part1.txt` - Alapelvek, logika, példák
- `game-specification-part2.txt` - JSON Schema, implementációs részletek

## Technológiai Stack

- **TypeScript** - Type-safe fejlesztés
- **Node.js** - Runtime environment
- **JSON** - Story format és adattárolás

## Telepítés és Használat

### Telepítés

```bash
# Függőségek telepítése
npm install

# TypeScript build
npm run build
```

### Console Player futtatása

```bash
# Demo történet futtatása
npm run example

# Saját történet futtatása
node dist/examples/console-player.js stories/your-story.json
```

### API Használat

```typescript
import { GameEngine, loadStoryFromFile, ConsoleRenderer } from 'aventura-game';

// Story betöltése
const story = await loadStoryFromFile('stories/demo.json');

// Engine létrehozása
const engine = new GameEngine(story);

// Renderer létrehozása
const renderer = new ConsoleRenderer();

// Event listener
engine.on((event) => {
  console.log('Event:', event.type);
});

// Játék indítása
engine.start();

// Választás
engine.makeChoice(0);

// Puzzle megoldása
engine.solvePuzzle(answer);
```

## Implementált Modulok

### Core
- ✅ Type definitions (types.ts)
- ✅ Requirements evaluator (requirements.ts)
- ✅ Effects system (effects.ts)
- ✅ Puzzle engine (puzzles.ts)
- ✅ State management (state.ts)
- ✅ Game engine (engine.ts)
- ✅ Story loader (loader.ts)
- ✅ Renderer interface (renderer.ts)

### Examples
- ✅ Console player (console-player.ts)

## Story JSON Format

Lásd a `stories/demo.json` fájlt egy teljes példáért. A story formátum a `docs/game-specification-part2.txt` fájlban van részletesen dokumentálva.

## Fejlesztés

```bash
# Watch mode
npm run dev

# Build
npm run build

# Lint
npm run lint

# Clean
npm run clean
```

## Licensz

MIT

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
