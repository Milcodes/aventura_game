/**
 * Core Game Engine
 * Main orchestrator for the interactive story game
 */

import {
  Story,
  GameState,
  Node,
  Choice,
  Puzzle,
  PuzzleResult,
} from '../core/types';
import { createInitialState, cloneState } from './state';
import { evaluateRequirement } from './requirements';
import { applyEffects, EffectResult } from './effects';
import { evaluatePuzzle, selectVariant } from './puzzles';

/**
 * Event emitted by the game engine
 */
export type GameEvent =
  | { type: 'node_entered'; nodeId: string; node: Node }
  | { type: 'choice_selected'; choice: Choice; choiceIndex: number }
  | { type: 'puzzle_started'; puzzle: Puzzle }
  | { type: 'puzzle_completed'; puzzle: Puzzle; result: PuzzleResult; success: boolean }
  | { type: 'effects_applied'; effects: EffectResult }
  | { type: 'state_changed'; state: GameState }
  | { type: 'game_ended'; node: Node };

export type GameEventListener = (event: GameEvent) => void;

/**
 * Main Game Engine class
 */
export class GameEngine {
  private story: Story;
  private state: GameState;
  private listeners: GameEventListener[] = [];
  private assetsById: Map<string, any>;
  private nodesById: Map<string, Node>;

  constructor(story: Story, initialState?: GameState) {
    this.story = story;
    this.state = initialState || createInitialState(story);

    // Build lookup maps
    this.assetsById = new Map();
    if (story.assets) {
      for (const asset of story.assets) {
        this.assetsById.set(asset.id, asset);
      }
    }

    this.nodesById = new Map();
    for (const node of story.nodes) {
      this.nodesById.set(node.id, node);
    }
  }

  /**
   * Get current game state (read-only copy)
   */
  getState(): Readonly<GameState> {
    return cloneState(this.state);
  }

  /**
   * Get the story
   */
  getStory(): Readonly<Story> {
    return this.story;
  }

  /**
   * Get current node
   */
  getCurrentNode(): Node | undefined {
    return this.nodesById.get(this.state.currentNodeId);
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodesById.get(nodeId);
  }

  /**
   * Get asset by ID
   */
  getAsset(assetId: string) {
    return this.assetsById.get(assetId);
  }

  /**
   * Add event listener
   */
  on(listener: GameEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: GameEventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Event listener error:', err);
      }
    }
  }

  /**
   * Start the game or enter the current node
   */
  start(): void {
    this.enterNode(this.state.currentNodeId);
  }

  /**
   * Enter a node
   */
  private enterNode(nodeId: string): void {
    const node = this.nodesById.get(nodeId);
    if (!node) {
      console.error(`Node not found: ${nodeId}`);
      return;
    }

    // Update state
    this.state.currentNodeId = nodeId;
    this.state.visited[nodeId] = true;

    // Apply on_enter effects
    if (node.on_enter?.effects) {
      const effectResult = applyEffects(node.on_enter.effects, this.state, this.story);
      this.emit({ type: 'effects_applied', effects: effectResult });

      // Check for goto effect
      if (effectResult.gotoNodeId) {
        this.enterNode(effectResult.gotoNodeId);
        return;
      }
    }

    // Emit events
    this.emit({ type: 'node_entered', nodeId, node });
    this.emit({ type: 'state_changed', state: cloneState(this.state) });

    // Check if this is an ending node
    if (node.type === 'ending') {
      this.emit({ type: 'game_ended', node });
    }

    // If there's a puzzle, emit puzzle_started
    if (node.puzzle) {
      const puzzle = this.applyPuzzleVariant(node.puzzle);
      this.emit({ type: 'puzzle_started', puzzle });
    }
  }

  /**
   * Apply puzzle variant if defined
   */
  private applyPuzzleVariant(puzzle: Puzzle): Puzzle {
    if (!puzzle.variants || puzzle.variants.length === 0) {
      return puzzle;
    }

    const selected = selectVariant(puzzle.variants);
    if (!selected) {
      return puzzle;
    }

    // Merge variant override into puzzle
    return { ...puzzle, ...selected.override } as Puzzle;
  }

  /**
   * Attempt to solve a puzzle
   */
  solvePuzzle(answer: unknown): boolean {
    const node = this.getCurrentNode();
    if (!node || !node.puzzle) {
      console.error('No active puzzle');
      return false;
    }

    const puzzle = node.puzzle;
    const puzzleId = puzzle.id;

    // Initialize puzzle state if not exists
    if (!this.state.puzzles[puzzleId]) {
      this.state.puzzles[puzzleId] = {
        solved: false,
        attempts: 0,
      };
    }

    const puzzleState = this.state.puzzles[puzzleId];

    // Check if already solved
    if (puzzleState.solved) {
      return true;
    }

    // Increment attempts
    puzzleState.attempts++;

    // Evaluate answer
    const result = evaluatePuzzle(puzzle, answer);
    puzzleState.last_answer = answer;
    puzzleState.score = result.score;

    const success = result.correct;

    if (success) {
      // Mark as solved
      puzzleState.solved = true;
      puzzleState.solved_at = Date.now();

      // Apply success effects
      if (puzzle.success?.effects) {
        const effectResult = applyEffects(puzzle.success.effects, this.state, this.story);
        this.emit({ type: 'effects_applied', effects: effectResult });
      }

      // Check for success next_id
      if (puzzle.success?.next_id) {
        this.emit({ type: 'puzzle_completed', puzzle, result, success });
        this.emit({ type: 'state_changed', state: cloneState(this.state) });
        this.enterNode(puzzle.success.next_id);
        return true;
      }
    } else {
      // Check if max attempts reached
      const maxAttempts = puzzle.attempts_max || Infinity;
      if (puzzleState.attempts >= maxAttempts) {
        // Apply failure effects
        if (puzzle.failure?.effects) {
          const effectResult = applyEffects(
            puzzle.failure.effects,
            this.state,
            this.story
          );
          this.emit({ type: 'effects_applied', effects: effectResult });
        }

        // Check for failure next_id
        if (puzzle.failure?.next_id) {
          this.emit({ type: 'puzzle_completed', puzzle, result, success });
          this.emit({ type: 'state_changed', state: cloneState(this.state) });
          this.enterNode(puzzle.failure.next_id);
          return false;
        }
      }
    }

    this.emit({ type: 'puzzle_completed', puzzle, result, success });
    this.emit({ type: 'state_changed', state: cloneState(this.state) });

    return success;
  }

  /**
   * Get available choices for current node
   */
  getAvailableChoices(): Array<{
    choice: Choice;
    index: number;
    available: boolean;
    reason?: string;
  }> {
    const node = this.getCurrentNode();
    if (!node || !node.choices) {
      return [];
    }

    const lockedIndices = this.state.lockedChoices?.[node.id] || [];

    return node.choices.map((choice, index) => {
      // Check if locked
      if (lockedIndices.includes(index)) {
        return {
          choice,
          index,
          available: false,
          reason: 'This choice is locked',
        };
      }

      // Check if puzzle needs to be solved first
      if (node.puzzle?.gate_choices_until_solved) {
        const puzzleState = this.state.puzzles[node.puzzle.id];
        if (!puzzleState?.solved) {
          return {
            choice,
            index,
            available: false,
            reason: 'Complete the puzzle first',
          };
        }
      }

      // Evaluate requirements
      const meetsRequirements = evaluateRequirement(
        choice.requirements,
        this.state,
        this.story
      );

      return {
        choice,
        index,
        available: meetsRequirements,
        reason: !meetsRequirements ? choice.disabled_reason : undefined,
      };
    });
  }

  /**
   * Make a choice
   */
  makeChoice(choiceIndex: number): boolean {
    const node = this.getCurrentNode();
    if (!node || !node.choices) {
      console.error('No choices available');
      return false;
    }

    const choice = node.choices[choiceIndex];
    if (!choice) {
      console.error(`Invalid choice index: ${choiceIndex}`);
      return false;
    }

    // Check if choice is available
    const availableChoices = this.getAvailableChoices();
    const choiceInfo = availableChoices[choiceIndex];
    if (!choiceInfo?.available) {
      console.error(`Choice not available: ${choiceInfo?.reason}`);
      return false;
    }

    // Emit choice selected
    this.emit({ type: 'choice_selected', choice, choiceIndex });

    // Apply choice effects
    if (choice.effects) {
      const effectResult = applyEffects(choice.effects, this.state, this.story);
      this.emit({ type: 'effects_applied', effects: effectResult });

      // Check for goto effect
      if (effectResult.gotoNodeId) {
        this.enterNode(effectResult.gotoNodeId);
        return true;
      }
    }

    // Navigate to next node
    this.enterNode(choice.next_id);
    return true;
  }

  /**
   * Load a saved state
   */
  loadState(state: GameState): void {
    this.state = cloneState(state);
    this.emit({ type: 'state_changed', state: cloneState(this.state) });
  }

  /**
   * Reset game to initial state
   */
  reset(): void {
    this.state = createInitialState(this.story);
    this.emit({ type: 'state_changed', state: cloneState(this.state) });
  }
}
