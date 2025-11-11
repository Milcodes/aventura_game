/**
 * Aventura Game Engine
 * Main entry point - exports all public APIs
 */

// Core types
export * from './core/types';

// Game engine
export { GameEngine } from './engine/engine';
export type { GameEvent, GameEventListener } from './engine/engine';

// State management
export {
  createInitialState,
  serializeState,
  deserializeState,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
  clearStateFromLocalStorage,
  cloneState,
  mergeState,
  validateState,
  getStateSummary,
} from './engine/state';
export type { StateSummary } from './engine/state';

// Story loader
export {
  loadStoryFromFile,
  loadStoryFromFileSync,
  loadStoryFromJSON,
  loadStoryFromURL,
  validateStory,
  getStoryMetadata,
} from './engine/loader';
export type { StoryMetadata } from './engine/loader';

// Requirements
export { evaluateRequirement, isTimerActive } from './engine/requirements';

// Effects
export { applyEffects } from './engine/effects';
export type { EffectResult } from './engine/effects';

// Puzzles
export { evaluatePuzzle, shuffleArray, selectVariant } from './engine/puzzles';

// Renderer
export { IRenderer, BaseRenderer, ConsoleRenderer } from './engine/renderer';
