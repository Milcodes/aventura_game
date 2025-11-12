# Timeline Editor Integration - Teljes Elemzés és Implementációs Terv

## 📊 I. RENDSZEREK ÖSSZEHASONLÍTÁSA

### A) Timeline Editor Adatstruktúra (Vizuális)

```typescript
// MAINLINE EVENTS
type MainEvent = {
  id: string;
  t: number;              // 0-1 (relatív pozíció a timeline-on)
  type: 'quiz' | 'note';
  title: string;
  description: string;
};

// BRANCH
type Branch = {
  id: string;
  title: string;
  terminal: boolean;      // Ha true, akkor halál (nem tér vissza)
  parent: Parent;         // Honnan indul
  points: Point[];        // SVG koordináták (x, y)
  depth: number;          // 0-5 (max 5 szint)
  events: BranchEvent[];
};

// PARENT (belépési pont)
type Parent =
  | { kind: 'main'; t: number }              // Mainline-ról indul
  | { kind: 'branch'; id: string; pointIndex: number };  // Branch-ről indul

// BRANCH EVENTS
type BranchEvent = {
  id: string;
  nodeIndex: number;      // Melyik point-on van (points[] indexe)
  type: 'quiz' | 'note';
  title: string;
  description: string;
};
```

**Jellemzők:**
- ✅ SVG-alapú vizualizáció (x,y koordináták)
- ✅ Relatív pozíció (t: 0-1)
- ✅ Drag-and-drop
- ✅ Terminal flag (halál)
- ✅ Parent lehet main vagy branch
- ✅ Max 5 depth
- ❌ Nincs backend persisztencia
- ❌ Nincs modal konfiguráció
- ❌ Csak quiz és note típus

---

### B) Backend Adatstruktúra (Persisztencia)

```typescript
// STORY
Story {
  id: string;
  title: string;
  description?: string;
  status: StoryStatus;        // DRAFT, REVIEW, PUBLISHED, ARCHIVED
  version: number;            // Optimistic locking
  isPublic: boolean;
  nodes: StoryNode[];
  branches: Branch[];
}

// STORY NODE (Mainline és Branch Node is)
StoryNode {
  id: string;
  storyId: string;
  branchId?: string;          // null = mainline, set = branch node
  order: number;              // Sorrend (1, 2, 3...)
  label: string;              // "Születés", "Gyerekkor"

  // Content
  mediaType?: string;         // "image", "video", "text"
  mediaUrl?: string;
  storyText?: string;

  // Decisions & Effects
  decisions: Json;            // [{text, targetNodeId, modalConfig, conditions}]
  effects: Json;              // [{type: 'ADD_ITEM', itemId, quantity}]
}

// BRANCH
Branch {
  id: string;
  storyId: string;
  name: string;               // User-written ("Barna Szoba")
  type: BranchType;           // LOCATION, ROOM, EVENT

  // Entry/Exit
  entryNodeId: string;        // Mainline vagy parent branch node ID
  exitNodeIds: Json;          // ["mainline_id"] vagy ["DEATH"]
  exitType: ExitType;         // NODE vagy DEATH

  // Nesting
  parentBranchId?: string;
  depth: number;              // Max 3

  nodes: StoryNode[];
}
```

**Jellemzők:**
- ✅ PostgreSQL persisztencia
- ✅ Validation (min 3 mainline, max 100/branch, max depth 3)
- ✅ Version control
- ✅ Status workflow
- ✅ Modal konfiguráció (decisions)
- ✅ Effects (inventory)
- ❌ Nincs vizuális pozíció (x,y)
- ❌ Order alapú (nem relatív t)

---

## 🔄 II. KULCSFONTOSSÁGÚ KÜLÖNBSÉGEK

| Jellemző | Timeline Editor | Backend |
|----------|----------------|---------|
| **Pozíció** | `t: 0-1` (relatív) | `order: 1,2,3` (abszolút) |
| **Koordináták** | `points: [{x,y}]` | Nincs (csak entry/exit ID) |
| **Entry pont** | `Parent: {kind, t/id, pointIndex}` | `entryNodeId: string` |
| **Exit pont** | `terminal: boolean` + reconnect | `exitNodeIds: string[]` + `exitType` |
| **Max depth** | 5 | 3 |
| **Event típusok** | `quiz \| note` | Bármilyen modal (quiz, dice, combat, memory, shop) |
| **Node tartalom** | `title + description` | `label + storyText + media + decisions + effects` |
| **Validáció** | Visual (ütközés, visszacsatlakozás) | Business logic (min nodes, max depth) |

---

## 🎯 III. INTEGRA Integráló STRATÉGIA

### Választott Megközelítés: **ADAPTER PATTERN**

Miért?
- ✅ Backend változatlan marad (stabil, validált)
- ✅ Timeline Editor is változatlan marad (működő komponens)
- ✅ Transzformációs réteg a kettő között
- ✅ Mindkét rendszer előnyeit kihasználjuk

```
┌─────────────────┐      Transform      ┌──────────────┐
│ Timeline Editor │ ◄─────────────────► │   Backend    │
│  (Vizuális)     │      Adapter        │ (Perzisztens)│
└─────────────────┘                     └──────────────┘
```

---

## 🛠️ IV. IMPLEMENTÁCIÓS TERV

### Fázis 1: Adapter Réteg Létrehozása

#### 1.1 `timelineAdapter.ts` - Adattranszformáció

```typescript
// Backend → Timeline
export function backendToTimeline(story: Story): TimelineData {
  // Mainline nodes → MainEvents
  // Branches + nodes → Timeline Branches
  // Entry/exit IDs → Parent struktúra + terminal flag
  // Order → t pozíció kalkuláció
}

// Timeline → Backend
export function timelineToBackend(timeline: TimelineData, storyId: string): {
  nodes: CreateStoryNodeDto[];
  branches: CreateBranchDto[];
} {
  // MainEvents → Mainline nodes
  // Timeline Branches → Backend branches + nodes
  // t pozíció → order kalkuláció
  // Parent struktúra → entryNodeId
  // Terminal flag → exitType = DEATH
}
```

**Transzformációs Logika:**

1. **t (0-1) ↔ order (1,2,3...)**
   ```typescript
   // Backend → Timeline
   t = (order - 1) / (maxOrder - 1)

   // Timeline → Backend
   order = Math.round(t * maxOrder) + 1
   ```

2. **Parent ↔ entryNodeId**
   ```typescript
   // Backend → Timeline
   Parent = {
     kind: branchId ? 'branch' : 'main',
     t: branchId ? undefined : calculateT(entryNode.order),
     id: branchId,
     pointIndex: branchId ? calculatePointIndex() : undefined
   }

   // Timeline → Backend
   entryNodeId = parent.kind === 'main'
     ? findMainlineNodeByT(parent.t).id
     : findBranchNodeByIndex(parent.id, parent.pointIndex).id
   ```

3. **terminal ↔ exitType**
   ```typescript
   // Backend → Timeline
   terminal = (exitType === ExitType.DEATH)

   // Timeline → Backend
   exitType = terminal ? ExitType.DEATH : ExitType.NODE
   exitNodeIds = terminal ? ['DEATH'] : [calculateExitNodeId()]
   ```

4. **points[] (x,y) → Entry/Exit Nodes**
   - Timeline: Vizuális útvonal (SVG koordináták)
   - Backend: Csak entry és exit ID tárolása
   - **Stratégia**: Koordináták NEM kerülnek mentésre (csak vizuális prezentáció)

---

### Fázis 2: Modal Típusok Bővítése

#### 2.1 Timeline Editor Modal Típusok

**Jelenlegi:** `quiz | note`

**Új típusok:**
```typescript
type EventType =
  | 'quiz'          // Quiz modal (kérdések)
  | 'note'          // Szöveges jegyzet
  | 'dice'          // Kockajáték
  | 'combat'        // 2 körös combat
  | 'memory'        // Memóriajáték
  | 'shop'          // Bolt modal
  | 'inventory'     // Inventory megjelenítés
  | 'decision';     // Egyszerű döntés (A/B/C)
```

#### 2.2 Modal Konfiguráció

```typescript
type ModalConfig = {
  type: EventType;

  // Quiz
  questions?: QuizQuestion[];
  timeLimit?: number;

  // Combat
  opponentName?: string;
  opponentStats?: { strength: number; speed: number };
  rounds?: number;

  // Memory
  cardCount?: number;
  timeLimit?: number;

  // Shop
  items?: ShopItem[];
  merchantName?: string;

  // Decision
  options?: DecisionOption[];
};
```

#### 2.3 Backend Decision Field

**Jelenleg:**
```typescript
decisions: Json // [{text, targetNodeId, modalConfig, conditions}]
```

**Bővítve:**
```typescript
type Decision = {
  text: string;
  targetNodeId: string;
  modalType?: EventType;
  modalConfig?: ModalConfig;
  conditions?: Condition[];  // pl. {itemId: 'sword', minQuantity: 1}
  effects?: Effect[];        // pl. {type: 'ADD_ITEM', itemId, quantity}
};
```

---

### Fázis 3: StoryEditor Integráció

#### 3.1 Új Tab: "Visual Editor"

**StoryEditor.tsx frissítése:**

```typescript
type Tab = 'metadata' | 'nodes' | 'branches' | 'preview' | 'visual';

{activeTab === 'visual' && (
  <TimelineEditorIntegrated
    storyId={story.id}
    story={story}
    onSave={handleTimelineSave}
  />
)}
```

#### 3.2 `TimelineEditorIntegrated.tsx` (Wrapper)

```typescript
export function TimelineEditorIntegrated({ storyId, story, onSave }) {
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);

  // Load: Backend → Timeline
  useEffect(() => {
    const data = backendToTimeline(story);
    setTimelineData(data);
  }, [story]);

  // Save: Timeline → Backend
  const handleSave = async () => {
    const { nodes, branches } = timelineToBackend(timelineData, storyId);

    // Töröld az összes létező node-ot és branch-et
    await deleteAllNodesAndBranches(storyId);

    // Hozd létre az új struktúrát
    await createNodesAndBranches(storyId, nodes, branches);

    onSave();
  };

  return (
    <div>
      <div className="controls">
        <button onClick={handleSave}>💾 Mentés Backend-be</button>
        <button onClick={handleValidate}>✓ Validálás</button>
      </div>

      <TimelineEditor
        initialData={timelineData}
        onChange={setTimelineData}
      />
    </div>
  );
}
```

---

### Fázis 4: Validáció Integrálása

#### 4.1 Timeline Validáció → Backend Validáció

**Timeline validáció (visual):**
- ✅ Minden branch visszatér vagy terminal
- ✅ Nincs ütközés
- ✅ Entry pont létezik

**Backend validáció (business logic):**
- ✅ Minimum 3 mainline node
- ✅ Maximum 100 node per branch
- ✅ Maximum depth 3 (nem 5!)
- ✅ Entry/exit node-ok léteznek

**Megoldás:**
```typescript
function validateTimelineForBackend(timeline: TimelineData): ValidationResult {
  const errors: string[] = [];

  // Mainline ellenőrzés
  if (timeline.events.length < 3) {
    errors.push('Minimum 3 mainline event szükséges');
  }

  // Branch ellenőrzés
  timeline.branches.forEach(branch => {
    // Depth max 3 (nem 5!)
    if (branch.depth > 3) {
      errors.push(`Branch "${branch.title}": Maximum 3 mélység engedélyezett`);
    }

    // Max 100 node
    if (branch.events.length > 100) {
      errors.push(`Branch "${branch.title}": Maximum 100 node engedélyezett`);
    }

    // Terminal vagy visszacsatlakozás
    if (!branch.terminal && !hasValidReconnection(branch)) {
      errors.push(`Branch "${branch.title}": Vagy terminal, vagy vissza kell csatlakoznia`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

---

### Fázis 5: Game Motor Integráció

#### 5.1 Játék Futtatás

**Jelenlegi GameView:**
- Backend-ről tölti a story-t
- Node-ok decisions[] alapján navigál
- Modal-ok decision.modalType alapján jelennek meg

**Nincs változás szükséges!** A backend struktúra már támogatja.

#### 5.2 Navigáció Logika

```typescript
// GameView.tsx
function navigateToNextNode(decision: Decision) {
  // 1. Modal megjelenítése (ha van)
  if (decision.modalType) {
    showModal(decision.modalType, decision.modalConfig);
  }

  // 2. Effects alkalmazása
  applyEffects(decision.effects);

  // 3. Következő node betöltése
  loadNode(decision.targetNodeId);
}
```

---

## 📋 V. IMPLEMENTÁCIÓS LÉPÉSEK

### Week 1: Adapter Alapok

- [ ] 1.1 `timelineAdapter.ts` létrehozása
- [ ] 1.2 `backendToTimeline()` implementálása
- [ ] 1.3 `timelineToBackend()` implementálása
- [ ] 1.4 Unit tesztek (10+ test case)

### Week 2: Modal Rendszer Bővítése

- [ ] 2.1 EventType bővítése (dice, combat, memory, shop)
- [ ] 2.2 ModalConfig típusok definiálása
- [ ] 2.3 Backend Decision field bővítése
- [ ] 2.4 Timeline Editor modal dropdown frissítése

### Week 3: UI Integráció

- [ ] 3.1 TimelineEditorIntegrated wrapper létrehozása
- [ ] 3.2 StoryEditor új "Visual" tab
- [ ] 3.3 Save/Load logika implementálása
- [ ] 3.4 Hibaüzenetek és loading állapotok

### Week 4: Validáció és Teszt

- [ ] 4.1 `validateTimelineForBackend()` implementálása
- [ ] 4.2 Real-time validáció feedback
- [ ] 4.3 End-to-end tesztek
- [ ] 4.4 Performance optimalizáció

---

## 🎨 VI. UI/UX TERVEZÉS

### Timeline Editor Toolbar Bővítése

```
┌────────────────────────────────────────────────────────┐
│  [Vissza] Történet: "Teszt"  v1.2  [DRAFT]            │
├────────────────────────────────────────────────────────┤
│  📝 Metadata │ 🔗 Nodes │ 🌳 Branches │ 👁️ Preview │ 🎨 Visual │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [Undo] [Redo]  [Zoom: 100%]  [Depth: 0,1,2,3]       │
│                                                        │
│  ┌─ Modal típusok ───────────────────────────────┐    │
│  │ • Quiz  • Note  • Dice  • Combat              │    │
│  │ • Memory  • Shop  • Inventory  • Decision     │    │
│  └───────────────────────────────────────────────┘    │
│                                                        │
│  [Timeline SVG Canvas]                                 │
│                                                        │
│  ┌─ Validáció ───────────────────────────────────┐    │
│  │ ✓ 5 mainline events                           │    │
│  │ ✓ 3 branches (összes visszatér)               │    │
│  │ ⚠ Branch "Kastély": Mélység 4 (max 3!)        │    │
│  └───────────────────────────────────────────────┘    │
│                                                        │
│  [💾 Mentés Backend-be]  [✓ Validálás]  [▶️ Előnézet] │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 VII. ADATINTEGRITÁS ÉS BIZTONSÁGI MEGFONTOLÁSOK

### 7.1 Mentés Stratégia

**Teljes Replace (Transaction-based):**

```typescript
async function saveTimelineToBackend(storyId: string, timeline: TimelineData) {
  await prisma.$transaction(async (tx) => {
    // 1. Töröld az összes node-ot és branch-et
    await tx.storyNode.deleteMany({ where: { storyId } });
    await tx.branch.deleteMany({ where: { storyId } });

    // 2. Transform
    const { nodes, branches } = timelineToBackend(timeline, storyId);

    // 3. Hozd létre az új struktúrát
    for (const node of nodes) {
      await tx.storyNode.create({ data: node });
    }

    for (const branch of branches) {
      await tx.branch.create({ data: branch });
    }

    // 4. Version bump
    await tx.story.update({
      where: { id: storyId },
      data: { version: { increment: 1 } }
    });
  });
}
```

### 7.2 Version Conflict Kezelés

```typescript
// Optimistic locking check
if (currentVersion !== expectedVersion) {
  throw new ConflictError('Story changed by another user. Please refresh.');
}
```

---

## 🚀 VIII. KÖVETKEZŐ LÉPÉSEK

### Prioritás 1: Adapter Implementálás
- Kezdd a `timelineAdapter.ts` létrehozásával
- Írj unit teszteket minden transzformációhoz
- Validáld a kétirányú konverziót

### Prioritás 2: Modal Bővítés
- Bővítsd a Timeline Editor modal típusokat
- Hozz létre ModalConfig interface-eket
- Backend decision field bővítése

### Prioritás 3: UI Integráció
- TimelineEditorIntegrated wrapper
- StoryEditor új tab
- Save/Load logika

---

## 📊 IX. VÁRHATÓ EREDMÉNYEK

### Amit a felhasználó lát:
✅ **Vizuális szerkesztő** - Drag-and-drop timeline
✅ **Minden modal típus** - Quiz, Dice, Combat, Memory, Shop, stb.
✅ **Real-time validáció** - Azonnal látja a hibákat
✅ **Undo/Redo** - Ctrl+Z/Y
✅ **Automatikus mentés** - Backend-be
✅ **Game Motor kompatibilitás** - Azonnal játszható

### Amit a backend lát:
✅ **Strukturált adatok** - Node + Branch + Decision
✅ **Validált** - Min/max szabályok
✅ **Verziókezelt** - Optimistic locking
✅ **Persisztens** - PostgreSQL
✅ **API kompatibilis** - Jelenlegi GameView működik

---

**Készen állsz az implementációra?** 🚀

Kezdjük a `timelineAdapter.ts` létrehozásával?
