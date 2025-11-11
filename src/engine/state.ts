/**
 * Game State Management
 * Initialize, save, and load game state
 */

import { GameState, Story } from '../core/types';

/**
 * Create initial game state from story definitions
 */
export function createInitialState(story: Story, startNodeId?: string): GameState {
  const state: GameState = {
    currentNodeId: startNodeId || (story.nodes[0]?.id || '1'),
    visited: {},
    inventory: {},
    currencies: {},
    stats: {},
    flags: {},
    puzzles: {},
    timers: {},
    lockedChoices: {},
  };

  // Initialize items to 0
  if (story.items) {
    for (const item of story.items) {
      state.inventory[item.id] = 0;
    }
  }

  // Initialize currencies to 0
  if (story.currencies) {
    for (const currency of story.currencies) {
      state.currencies[currency.id] = 0;
    }
  }

  // Initialize stats to start values
  if (story.stats) {
    for (const stat of story.stats) {
      state.stats[stat.id] = stat.start;
    }
  }

  return state;
}

/**
 * Serialize game state to JSON
 */
export function serializeState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Deserialize game state from JSON
 */
export function deserializeState(json: string): GameState {
  return JSON.parse(json) as GameState;
}

/**
 * Simple Storage interface
 */
interface IStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Get localStorage from global context (browser)
 */
function getLocalStorage(): IStorage | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    return g.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Save game state to localStorage (browser)
 */
export function saveStateToLocalStorage(
  state: GameState,
  key: string = 'aventura_game_save'
): void {
  const storage = getLocalStorage();
  if (!storage) {
    throw new Error('localStorage is not available');
  }
  storage.setItem(key, serializeState(state));
}

/**
 * Load game state from localStorage (browser)
 */
export function loadStateFromLocalStorage(
  key: string = 'aventura_game_save'
): GameState | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const json = storage.getItem(key);
  if (!json) {
    return null;
  }

  try {
    return deserializeState(json);
  } catch (err) {
    console.error('Failed to load game state:', err);
    return null;
  }
}

/**
 * Clear game state from localStorage
 */
export function clearStateFromLocalStorage(
  key: string = 'aventura_game_save'
): void {
  const storage = getLocalStorage();
  if (storage) {
    storage.removeItem(key);
  }
}

/**
 * Clone game state (deep copy)
 */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Merge partial state updates into current state
 */
export function mergeState(
  current: GameState,
  updates: Partial<GameState>
): GameState {
  return {
    ...current,
    ...updates,
    visited: { ...current.visited, ...updates.visited },
    inventory: { ...current.inventory, ...updates.inventory },
    currencies: { ...current.currencies, ...updates.currencies },
    stats: { ...current.stats, ...updates.stats },
    flags: { ...current.flags, ...updates.flags },
    puzzles: { ...current.puzzles, ...updates.puzzles },
    timers: { ...current.timers, ...updates.timers },
    lockedChoices: { ...current.lockedChoices, ...updates.lockedChoices },
  };
}

/**
 * Validate game state integrity
 */
export function validateState(state: GameState, story: Story): string[] {
  const errors: string[] = [];

  // Check if current node exists
  const currentNode = story.nodes.find((n) => n.id === state.currentNodeId);
  if (!currentNode) {
    errors.push(`Current node not found: ${state.currentNodeId}`);
  }

  // Check if inventory items are defined
  for (const itemId of Object.keys(state.inventory)) {
    const itemDef = story.items?.find((item) => item.id === itemId);
    if (!itemDef) {
      errors.push(`Inventory contains undefined item: ${itemId}`);
    }
  }

  // Check if currencies are defined
  for (const currencyId of Object.keys(state.currencies)) {
    const currencyDef = story.currencies?.find((c) => c.id === currencyId);
    if (!currencyDef) {
      errors.push(`State contains undefined currency: ${currencyId}`);
    }
  }

  // Check if stats are defined and within bounds
  for (const [statId, value] of Object.entries(state.stats)) {
    const statDef = story.stats?.find((s) => s.id === statId);
    if (!statDef) {
      errors.push(`State contains undefined stat: ${statId}`);
    } else if (value < statDef.min || value > statDef.max) {
      errors.push(
        `Stat ${statId} value ${value} is out of bounds [${statDef.min}, ${statDef.max}]`
      );
    }
  }

  return errors;
}

/**
 * Get summary statistics from game state
 */
export interface StateSummary {
  currentNodeId: string;
  visitedCount: number;
  itemCount: number;
  totalCurrency: number;
  puzzlesSolved: number;
  puzzlesTotal: number;
  activeTimers: number;
}

export function getStateSummary(state: GameState): StateSummary {
  const visitedCount = Object.values(state.visited).filter(Boolean).length;
  const itemCount = Object.values(state.inventory).reduce((sum, qty) => sum + qty, 0);
  const totalCurrency = Object.values(state.currencies).reduce(
    (sum, amt) => sum + amt,
    0
  );

  const puzzlesSolved = Object.values(state.puzzles).filter((p) => p.solved).length;
  const puzzlesTotal = Object.keys(state.puzzles).length;

  const now = Date.now();
  const activeTimers = Object.values(state.timers).filter(
    (t) => t.expiresAt > now
  ).length;

  return {
    currentNodeId: state.currentNodeId,
    visitedCount,
    itemCount,
    totalCurrency,
    puzzlesSolved,
    puzzlesTotal,
    activeTimers,
  };
}
