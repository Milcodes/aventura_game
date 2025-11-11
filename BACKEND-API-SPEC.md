# Backend API Specification (Recommended Implementation)

## Overview

Ez a dokumentum a **javasolt backend API** specifikációját tartalmazza az Aventura Game számára.

⚠️ **FONTOS**: Jelenleg **nincs backend implementáció** - csak a core engine (TypeScript) készült el.

## Miért kell Backend?

1. **Anti-cheat**: Puzzle megoldások ne kerüljenek kliensre
2. **Perzisztencia**: Save/load több eszközön keresztül
3. **Analytics**: Játékos statisztikák, metrikák
4. **Leaderboard**: Globális ranglisták
5. **Multiplayer**: (opcionális) Játékos interakció

---

## API Endpoints

### 1. Session Management

#### `POST /api/session/create`
Új játék session létrehozása

**Request**:
```json
{
  "storyId": "ezustkapu-demo",
  "userId": "user123" // optional
}
```

**Response**:
```json
{
  "sessionId": "sess_abc123",
  "sessionToken": "jwt_token_here",
  "expiresAt": 1699700000000,
  "initialState": {
    "currentNodeId": "1",
    "inventory": {},
    "currencies": {},
    "stats": { "health": 10, "corruption": 0, "reputation": 0 },
    "flags": {},
    "puzzles": {},
    "timers": {},
    "visited": {}
  }
}
```

---

#### `GET /api/session/:sessionId`
Session lekérdezése

**Headers**:
```
Authorization: Bearer <sessionToken>
```

**Response**:
```json
{
  "sessionId": "sess_abc123",
  "storyId": "ezustkapu-demo",
  "state": { /* GameState */ },
  "createdAt": 1699600000000,
  "updatedAt": 1699650000000
}
```

---

### 2. Puzzle Validation (Anti-Cheat)

#### `POST /api/puzzle/validate`
Puzzle válasz ellenőrzése szerverenoldalon

**Request**:
```json
{
  "sessionId": "sess_abc123",
  "puzzleId": "pz_article_apfel",
  "answer": "der",
  "attemptNumber": 1,
  "timeSpentMs": 5234
}
```

**Headers**:
```
Authorization: Bearer <sessionToken>
```

**Response (Success)**:
```json
{
  "success": true,
  "correct": true,
  "score": 1.0,
  "message": "Correct answer!",
  "effects": [
    { "op": "add_currency", "currency_id": "crystal", "value": 1 },
    { "op": "add_stat", "stat_id": "reputation", "value": 1 }
  ],
  "newState": {
    "puzzles": {
      "pz_article_apfel": {
        "solved": true,
        "attempts": 1,
        "time_ms": 5234,
        "score": 1,
        "solved_at": 1699700000000
      }
    },
    "currencies": { "crystal": 1 },
    "stats": { "reputation": 1 }
  }
}
```

**Response (Incorrect)**:
```json
{
  "success": true,
  "correct": false,
  "score": 0,
  "message": "Incorrect answer. Try again!",
  "attemptsRemaining": 1,
  "maxAttempts": 2,
  "effects": [],
  "newState": {
    "puzzles": {
      "pz_article_apfel": {
        "solved": false,
        "attempts": 1
      }
    }
  }
}
```

**Response (Max Attempts Reached)**:
```json
{
  "success": true,
  "correct": false,
  "score": 0,
  "message": "Maximum attempts reached.",
  "attemptsRemaining": 0,
  "maxAttempts": 2,
  "effects": [
    { "op": "add_stat", "stat_id": "corruption", "value": 1 }
  ],
  "nextNodeId": "failure_node", // optional
  "newState": { /* ... */ }
}
```

---

### 3. State Management

#### `PUT /api/state/save`
Játékállapot mentése

**Request**:
```json
{
  "sessionId": "sess_abc123",
  "state": {
    "currentNodeId": "3A1",
    "inventory": { "silver_key": 1 },
    "currencies": { "coin": 5, "crystal": 1 },
    "stats": { "health": 10, "corruption": 0, "reputation": 1 },
    "flags": { "saw_tower": true },
    "puzzles": { /* ... */ },
    "timers": { /* ... */ },
    "visited": { "1": true, "2A": true, "3A1": true }
  }
}
```

**Headers**:
```
Authorization: Bearer <sessionToken>
```

**Response**:
```json
{
  "success": true,
  "savedAt": 1699700000000,
  "stateVersion": 3
}
```

---

#### `GET /api/state/load/:sessionId`
Mentett állapot betöltése

**Headers**:
```
Authorization: Bearer <sessionToken>
```

**Response**:
```json
{
  "success": true,
  "state": { /* GameState */ },
  "savedAt": 1699700000000,
  "stateVersion": 3
}
```

---

### 4. Shop Transactions (Optional)

#### `POST /api/shop/transaction`
Shop vásárlás/eladás

**Request**:
```json
{
  "sessionId": "sess_abc123",
  "action": "buy", // or "sell"
  "itemId": "health_potion",
  "quantity": 1,
  "cost": {
    "currency_id": "coin",
    "value": 10
  }
}
```

**Headers**:
```
Authorization: Bearer <sessionToken>
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Purchase successful!",
  "newBalance": {
    "coin": 40,
    "crystal": 5
  },
  "newInventory": {
    "health_potion": 1,
    "silver_key": 1
  },
  "effects": [
    { "op": "add_currency", "currency_id": "coin", "value": -10 },
    { "op": "add_item", "item_id": "health_potion", "qty": 1 }
  ]
}
```

**Response (Insufficient Funds)**:
```json
{
  "success": false,
  "error": "INSUFFICIENT_FUNDS",
  "message": "Not enough coin. Required: 10, Available: 5",
  "required": {
    "currency_id": "coin",
    "value": 10
  },
  "available": {
    "currency_id": "coin",
    "value": 5
  }
}
```

---

### 5. Analytics & Metrics

#### `POST /api/analytics/event`
Játékos esemény naplózása

**Request**:
```json
{
  "sessionId": "sess_abc123",
  "eventType": "node_entered",
  "eventData": {
    "nodeId": "3A1",
    "timestamp": 1699700000000
  }
}
```

**Response**:
```json
{
  "success": true
}
```

#### `GET /api/analytics/stats/:sessionId`
Játékos statisztikák

**Response**:
```json
{
  "sessionId": "sess_abc123",
  "totalPlayTimeMs": 1234567,
  "nodesVisited": 15,
  "puzzlesSolved": 5,
  "puzzlesFailed": 2,
  "choicesMade": 18,
  "itemsCollected": 7,
  "currencyEarned": {
    "coin": 50,
    "crystal": 3
  }
}
```

---

## Authentication & Security

### JWT Token Structure
```json
{
  "sub": "user123",
  "sessionId": "sess_abc123",
  "storyId": "ezustkapu-demo",
  "iat": 1699600000,
  "exp": 1699700000
}
```

### Security Best Practices
1. **HTTPS only** - Minden API hívás TLS-el titkosítva
2. **Rate limiting** - Max 100 req/min per session
3. **Input validation** - Minden input sanitizálva
4. **SQL injection protection** - Parameterized queries
5. **XSS protection** - HTML escape minden user input
6. **CSRF tokens** - State-changing műveletekhez

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": { /* optional */ }
}
```

### Error Codes
| Code | Description |
|------|-------------|
| `INVALID_SESSION` | Session nem létezik vagy lejárt |
| `INVALID_TOKEN` | JWT token érvénytelen |
| `INVALID_PUZZLE` | Puzzle ID nem létezik |
| `INVALID_ANSWER` | Answer formátum hibás |
| `MAX_ATTEMPTS_REACHED` | Puzzle próbálkozás limit |
| `INSUFFICIENT_FUNDS` | Nincs elég currency |
| `INVENTORY_FULL` | Inventory tele |
| `ITEM_NOT_FOUND` | Item nem létezik |
| `RATE_LIMIT_EXCEEDED` | Túl sok request |
| `INTERNAL_ERROR` | Szerver hiba |

---

## WebSocket API (Real-time)

### Connection
```javascript
const ws = new WebSocket('wss://api.aventura.game/ws');

ws.send(JSON.stringify({
  type: 'authenticate',
  sessionToken: 'jwt_token_here'
}));
```

### Events

#### Client → Server
```json
{
  "type": "state_update",
  "sessionId": "sess_abc123",
  "state": { /* partial state */ }
}
```

#### Server → Client
```json
{
  "type": "state_synced",
  "sessionId": "sess_abc123",
  "state": { /* full state */ },
  "timestamp": 1699700000000
}
```

---

## Database Schema (Recommended)

### `sessions` Table
```sql
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  story_id VARCHAR(64) NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  INDEX idx_user_story (user_id, story_id)
);
```

### `puzzle_attempts` Table
```sql
CREATE TABLE puzzle_attempts (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  puzzle_id VARCHAR(64) NOT NULL,
  answer TEXT,
  correct BOOLEAN,
  score FLOAT,
  time_spent_ms INT,
  attempted_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### `analytics_events` Table
```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_session_type (session_id, event_type)
);
```

---

## Implementation Stack Recommendations

### Backend Framework
- **Node.js + Express.js** (könnyű integráció TypeScript-tel)
- **NestJS** (enterprise grade, built-in TypeScript)
- **Fastify** (nagy teljesítmény)

### Database
- **PostgreSQL** (JSONB support, robusztus)
- **MongoDB** (dokumentum-alapú, flexibilis)
- **Redis** (session cache, rate limiting)

### Hosting
- **Vercel** / **Netlify** (serverless functions)
- **Heroku** (egyszerű deploy)
- **AWS** / **GCP** (skálázható produkció)

---

## Client Integration Example

```typescript
import { GameEngine, loadStoryFromURL } from 'aventura-game';

// Backend API client
class BackendClient {
  private sessionToken: string;

  async createSession(storyId: string) {
    const res = await fetch('/api/session/create', {
      method: 'POST',
      body: JSON.stringify({ storyId }),
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    this.sessionToken = data.sessionToken;
    return data;
  }

  async validatePuzzle(puzzleId: string, answer: unknown) {
    const res = await fetch('/api/puzzle/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ puzzleId, answer })
    });
    return res.json();
  }

  async saveState(state: GameState) {
    await fetch('/api/state/save', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ state })
    });
  }
}

// Usage
const backend = new BackendClient();
const session = await backend.createSession('ezustkapu-demo');

const story = await loadStoryFromURL('/stories/demo.json');
const engine = new GameEngine(story, session.initialState);

// Override puzzle solving to use backend
const originalSolvePuzzle = engine.solvePuzzle.bind(engine);
engine.solvePuzzle = async (answer: unknown) => {
  const currentNode = engine.getCurrentNode();
  if (!currentNode?.puzzle) return false;

  const result = await backend.validatePuzzle(currentNode.puzzle.id, answer);

  // Apply effects from backend
  for (const effect of result.effects) {
    // Apply effect to state
  }

  return result.correct;
};

// Auto-save on state change
engine.on((event) => {
  if (event.type === 'state_changed') {
    backend.saveState(event.state);
  }
});
```

---

## Testing

### Puzzle Validation Test
```typescript
describe('POST /api/puzzle/validate', () => {
  it('should validate correct answer', async () => {
    const res = await request(app)
      .post('/api/puzzle/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sessionId: 'test_sess',
        puzzleId: 'pz_article_apfel',
        answer: 'der'
      });

    expect(res.status).toBe(200);
    expect(res.body.correct).toBe(true);
    expect(res.body.score).toBe(1);
  });

  it('should reject incorrect answer', async () => {
    const res = await request(app)
      .post('/api/puzzle/validate')
      .send({ puzzleId: 'pz_article_apfel', answer: 'die' });

    expect(res.body.correct).toBe(false);
  });
});
```

---

## Summary

✅ **Teljes API specifikáció** puzzle validation, state management, shop, analytics számára

⚠️ **Jelenleg NINCS implementálva** - csak a specifikáció készült el

🚀 **Implementálás javasolt stack**: Node.js + Express/NestJS + PostgreSQL + Redis

📦 **Kliens integráció**: Egyszerű fetch() hívások a core engine mellé

---

**Next Steps**:
1. Backend projekt setup (NestJS ajánlott)
2. Database setup (PostgreSQL + Redis)
3. API endpoints implementálása
4. Client library (@aventura-game/client)
5. WebSocket support (opcionális)
6. Deployment (Vercel/AWS)
