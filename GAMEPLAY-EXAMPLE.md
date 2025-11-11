# Gameplay Examples - Console Output

## Example 1: Gated Puzzle (gate_choices_until_solved)

```
============================================================

Orzo es tudaskviz

Egy lebego gomb. Az Orzo megkerdezi: ismered a nevelo helyes alakjat?

------------------------------------------------------------

[Media]
  illustration: img_apple

[Puzzle]
Valaszd ki a helyes nevelo alakot: — Apfel

Hints:
  1. Nom eset alapalak.
  2. Gyumolcs, himnem.

[Choices]
  1. Tudast kerek (Complete the puzzle first)
  2. Hatalmat valasztok (Complete the puzzle first)

Your choice: der

✓ Correct!

Currency crystal: 0 -> 1
Stat Hirnev: 0 -> 1

[Choices]
  1. Tudast kerek
  2. Hatalmat valasztok

Your choice: 1
```

**Magyarázat**:
- A puzzle `gate_choices_until_solved: true` beállítással rendelkezik
- Amíg nem oldod meg, a choices "Complete the puzzle first" üzenettel tiltva vannak
- Helyes válasz után a choices elérhetővé válnak

---

## Example 2: Disabled Choice (Requirements Not Met)

```
============================================================

Tudas terhe

Megerted a valasztasok halojat. Most donts: nyitod az ezust kaput?

------------------------------------------------------------

[Choices]
  1. Ezust ajto kinyitasa (Kulcs es semleges vagy jobb hirnev szukseges.)
  2. Halo elvagasa

Your choice: 1

Choice not available: Kulcs es semleges vagy jobb hirnev szukseges.

[Game State]
Inventory:
  silver_key: 0
  infernal_shard: 1
Currencies:
  coin: 5
  crystal: 1
Stats:
  health: 10
  corruption: 1
  reputation: -2

Your choice: 2
```

**Magyarázat**:
- Az első choice komplex requirements-szel rendelkezik:
  ```json
  {
    "all_of": [
      { "op": "has_item", "item_id": "silver_key", "qty": 1 },
      { "op": "stat_between", "stat_id": "reputation", "min": 0, "max": 10 },
      { "any_of": [
        { "op": "puzzle_solved", "puzzle_id": "pz_article_apfel" },
        { "op": "visited_node", "node_id": "3A2" }
      ]}
    ]
  }
  ```
- Játékos nem rendelkezik silver_key-vel (0)
- Reputation -2 (nem 0-10 között)
- Ezért a choice disabled_reason jelenik meg

---

## Example 3: Successful Purchase (Choice with Currency Requirement)

```
============================================================

Felveszem a kulcsot es visszamegyek

Kivul koszobor markaban kulcs. Felveszed.

------------------------------------------------------------

Item added: Ezustkulcs x1

[Game State]
Inventory:
  silver_key: 1
  infernal_shard: 0
Stats:
  health: 10
  corruption: 0
  reputation: 0

[Choices]
  1. Fel a kek fenyhez
  2. Le a voros izzasba

Your choice: 1
```

**Magyarázat**:
- Choice effect: `{ "op": "add_item", "item_id": "silver_key", "qty": 1 }`
- Inventory frissül: silver_key: 0 → 1
- Most már használható a kulcs későbbi choice-okban

---

## Example 4: Failed Transaction (Not Enough Currency)

**Példa shop choice** (nem a demo story-ban, de így működne):

```json
{
  "label": "Vasarolj magikus kristalyt (10 coin)",
  "next_id": "shop",
  "requirements": { "op": "currency_gte", "currency_id": "coin", "value": 10 },
  "effects": [
    { "op": "add_currency", "currency_id": "coin", "value": -10 },
    { "op": "add_currency", "currency_id": "crystal", "value": 1 }
  ],
  "disabled_reason": "Nincs eleg coin (10 szukseges)"
}
```

**Console output**:
```
[Choices]
  1. Vasarolj magikus kristalyt (10 coin) (Nincs eleg coin (10 szukseges))
  2. Visszalepek

[Game State]
Currencies:
  coin: 5
  crystal: 0

Your choice: 1

Choice not available: Nincs eleg coin (10 szukseges)
```

---

## Example 5: Loot Table (Random Reward)

```
============================================================

Visszautasitom

Visszautasitod a demon ajanlat. Egy rejett kincsesladika talalsz!

------------------------------------------------------------

Loot table rolled:
Currency coin: 0 -> 5

[Game State]
Currencies:
  coin: 5
  crystal: 0

Your choice: ...
```

**Másik lehetséges kimenet** (30% valószínűség):
```
Loot table rolled:
Added 1 x Pokoli szilank (total: 1)
```

**Harmadik lehetséges kimenet** (10% valószínűség):
```
Loot table rolled:
Stat Hirnev: 0 -> 1
```

**Loot table definíció**:
```json
{
  "op": "loot_table",
  "table": [
    { "weight": 60, "effects": [{ "op": "add_currency", "currency_id": "coin", "value": 5 }] },
    { "weight": 30, "effects": [{ "op": "add_item", "item_id": "infernal_shard", "qty": 1 }] },
    { "weight": 10, "effects": [{ "op": "add_stat", "stat_id": "reputation", "value": 1 }] }
  ]
}
```

---

## Example 6: Timer Gate

```
============================================================

Nevtelen kapu

Felirat: Csak aki elveszti a nevet, lephet at. Az ajto megnyilik ket percre.

------------------------------------------------------------

Timer door_open set to expire in 120000ms

[Choices]
  1. Atkecmeregek a nyitott ajton
  2. Visszafordulok

Your choice: 1

[Going to node 5X...]
```

**Ha túl sokáig vársz** (120 másodperc után):
```
[Choices]
  1. Atkecmeregek a nyitott ajton (Az ajto zarva van.)
  2. Visszafordulok

Your choice: 1

Choice not available: Az ajto zarva van.
```

**Timer logika**:
```typescript
// on_enter:
{ "op": "set_timer", "timer_flag": "door_open", "expires_in_ms": 120000 }

// choice requirements:
{ "op": "flag_is", "flag": "door_open", "value": true }
```

---

## Example 7: Complex Puzzle - Hotspot

```
============================================================

Lancolt demon

Lava folyam mellett lancolt demon sug: Szabadits ki, jutalmat kapsz!

------------------------------------------------------------

[Media]
  illustration: img_demon

[Puzzle]
Jelold be a lanc rogziteseit a falon.

Hints:
  (none)

Your answer format: a1, a2 (area IDs separated by comma)

Your choice: a1, a2

✓ Correct!

Added 1 x Pokoli szilank (total: 1)

[Choices]
  1. Segitek a demonon
  2. Visszautasitom

Your choice: 1
```

**Incorrect attempt**:
```
Your choice: a3

✗ Incorrect

Attempts remaining: 1 / 2

Your choice: a1, a2

✓ Correct!
```

---

## Example 8: Game Ending

```
============================================================

★ THE END ★

Uj Orzo

Te orzod a dontesek dallamat. A vilagok egyseget teremtetted.

============================================================

Play again? (y/n): n

Thanks for playing!
```

---

## State Progression Example

### Initial State
```json
{
  "currentNodeId": "1",
  "visited": {},
  "inventory": { "silver_key": 0, "infernal_shard": 0 },
  "currencies": { "coin": 0, "crystal": 0 },
  "stats": { "health": 10, "corruption": 0, "reputation": 0 },
  "flags": {},
  "puzzles": {},
  "timers": {}
}
```

### After Node 1 → 2B (Get Key)
```json
{
  "currentNodeId": "2A",
  "visited": { "1": true, "2B": true, "2A": true },
  "inventory": { "silver_key": 1, "infernal_shard": 0 },
  "currencies": { "coin": 0, "crystal": 0 },
  "stats": { "health": 10, "corruption": 0, "reputation": 0 },
  "flags": { "saw_tower": true },
  "puzzles": {},
  "timers": {}
}
```

### After Solving Article Puzzle
```json
{
  "currentNodeId": "3A1",
  "visited": { "1": true, "2A": true, "2B": true, "3A1": true },
  "inventory": { "silver_key": 1, "infernal_shard": 0 },
  "currencies": { "coin": 0, "crystal": 1 },
  "stats": { "health": 10, "corruption": 0, "reputation": 1 },
  "flags": { "saw_tower": true },
  "puzzles": {
    "pz_article_apfel": {
      "solved": true,
      "attempts": 1,
      "time_ms": 5234,
      "score": 1,
      "solved_at": 1699700000000
    }
  },
  "timers": {}
}
```

### After Timer Node + Loot Table
```json
{
  "currentNodeId": "4A2b",
  "visited": { "1": true, "2A": true, "3A2": true, "4A2b": true },
  "inventory": { "silver_key": 0, "infernal_shard": 1 },
  "currencies": { "coin": 5, "crystal": 0 },
  "stats": { "health": 10, "corruption": 1, "reputation": -1 },
  "flags": { "saw_tower": true },
  "puzzles": {
    "pz_demon_hotspot": {
      "solved": true,
      "attempts": 1,
      "score": 1,
      "solved_at": 1699700050000
    }
  },
  "timers": {
    "door_open": {
      "expiresAt": 1699700120000
    }
  }
}
```
