/**
 * Renderer Interface
 * Contract for implementing game UI renderers
 */

import { Node, Choice, Puzzle, GameState, MediaRef, PuzzleResult } from '../core/types';

/**
 * Interface for rendering the game UI
 */
export interface IRenderer {
  /**
   * Render a node (title, text, media)
   */
  renderNode(node: Node): void;

  /**
   * Render media elements
   */
  renderMedia(mediaRefs: MediaRef[]): void;

  /**
   * Render available choices
   */
  renderChoices(
    choices: Array<{
      choice: Choice;
      index: number;
      available: boolean;
      reason?: string;
    }>
  ): void;

  /**
   * Render a puzzle
   */
  renderPuzzle(puzzle: Puzzle): void;

  /**
   * Display puzzle result
   */
  displayPuzzleResult(result: PuzzleResult, success: boolean): void;

  /**
   * Render game state HUD (inventory, stats, etc.)
   */
  renderHUD(state: GameState): void;

  /**
   * Display a message or log
   */
  displayMessage(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void;

  /**
   * Clear the screen/canvas
   */
  clear(): void;

  /**
   * Show game ending
   */
  showEnding(node: Node): void;

  /**
   * Show loading indicator
   */
  showLoading(show: boolean): void;
}

/**
 * Abstract base renderer with common utilities
 */
export abstract class BaseRenderer implements IRenderer {
  abstract renderNode(node: Node): void;
  abstract renderMedia(mediaRefs: MediaRef[]): void;
  abstract renderChoices(
    choices: Array<{
      choice: Choice;
      index: number;
      available: boolean;
      reason?: string;
    }>
  ): void;
  abstract renderPuzzle(puzzle: Puzzle): void;
  abstract displayPuzzleResult(result: PuzzleResult, success: boolean): void;
  abstract renderHUD(state: GameState): void;
  abstract displayMessage(message: string, type?: 'info' | 'success' | 'error' | 'warning'): void;
  abstract clear(): void;
  abstract showEnding(node: Node): void;
  abstract showLoading(show: boolean): void;

  /**
   * Format inventory display
   */
  protected formatInventory(inventory: Record<string, number>): string[] {
    return Object.entries(inventory)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => `${id}: ${qty}`);
  }

  /**
   * Format currencies display
   */
  protected formatCurrencies(currencies: Record<string, number>): string[] {
    return Object.entries(currencies).map(([id, amount]) => `${id}: ${amount}`);
  }

  /**
   * Format stats display
   */
  protected formatStats(stats: Record<string, number>): string[] {
    return Object.entries(stats).map(([id, value]) => `${id}: ${value}`);
  }

  /**
   * Format flags display
   */
  protected formatFlags(flags: Record<string, boolean>): string[] {
    return Object.entries(flags)
      .filter(([_, value]) => value)
      .map(([id]) => id);
  }
}

/**
 * Console-based renderer (for CLI/terminal)
 */
export class ConsoleRenderer extends BaseRenderer {
  private useColors: boolean;

  constructor(useColors: boolean = true) {
    super();
    this.useColors = useColors;
  }

  renderNode(node: Node): void {
    console.log('\n' + '='.repeat(60));
    console.log(this.color(`\n${node.title}`, 'cyan', 'bold'));
    console.log('\n' + node.text);
    console.log('\n' + '-'.repeat(60));
  }

  renderMedia(mediaRefs: MediaRef[]): void {
    if (mediaRefs.length === 0) return;
    console.log('\n[Media]');
    for (const ref of mediaRefs) {
      console.log(`  ${ref.role || 'media'}: ${ref.asset_id}`);
    }
  }

  renderChoices(
    choices: Array<{
      choice: Choice;
      index: number;
      available: boolean;
      reason?: string;
    }>
  ): void {
    console.log('\n[Choices]');
    for (const { choice, index, available, reason } of choices) {
      if (available) {
        console.log(this.color(`  ${index + 1}. ${choice.label}`, 'green'));
      } else {
        console.log(
          this.color(`  ${index + 1}. ${choice.label}`, 'gray') +
            (reason ? ` (${reason})` : '')
        );
      }
    }
  }

  renderPuzzle(puzzle: Puzzle): void {
    console.log('\n' + this.color('[Puzzle]', 'yellow', 'bold'));
    console.log(puzzle.prompt);
    if (puzzle.hints && puzzle.hints.length > 0) {
      console.log(this.color('\nHints:', 'yellow'));
      puzzle.hints.forEach((hint, i) => console.log(`  ${i + 1}. ${hint}`));
    }
  }

  displayPuzzleResult(result: PuzzleResult, success: boolean): void {
    if (success) {
      console.log(this.color('\n✓ Correct!', 'green', 'bold'));
    } else {
      console.log(this.color('\n✗ Incorrect', 'red', 'bold'));
    }
    if (result.message) {
      console.log(result.message);
    }
  }

  renderHUD(state: GameState): void {
    console.log('\n' + this.color('[Game State]', 'blue', 'bold'));

    const inventory = this.formatInventory(state.inventory);
    if (inventory.length > 0) {
      console.log(this.color('Inventory:', 'blue'));
      inventory.forEach((item) => console.log(`  ${item}`));
    }

    const currencies = this.formatCurrencies(state.currencies);
    if (currencies.length > 0) {
      console.log(this.color('Currencies:', 'blue'));
      currencies.forEach((c) => console.log(`  ${c}`));
    }

    const stats = this.formatStats(state.stats);
    if (stats.length > 0) {
      console.log(this.color('Stats:', 'blue'));
      stats.forEach((s) => console.log(`  ${s}`));
    }
  }

  displayMessage(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info'
  ): void {
    const colors: Record<string, string> = {
      info: 'blue',
      success: 'green',
      error: 'red',
      warning: 'yellow',
    };
    console.log('\n' + this.color(message, colors[type]));
  }

  clear(): void {
    console.clear();
  }

  showEnding(node: Node): void {
    console.log('\n' + '='.repeat(60));
    console.log(this.color('\n★ THE END ★', 'magenta', 'bold'));
    console.log(this.color(`\n${node.title}`, 'cyan', 'bold'));
    console.log('\n' + node.text);
    console.log('\n' + '='.repeat(60));
  }

  showLoading(show: boolean): void {
    if (show) {
      console.log(this.color('\nLoading...', 'gray'));
    }
  }

  /**
   * Apply ANSI color codes
   */
  private color(text: string, color: string, style?: string): string {
    if (!this.useColors) return text;

    const colors: Record<string, string> = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      gray: '\x1b[90m',
      red: '\x1b[91m',
      green: '\x1b[92m',
      yellow: '\x1b[93m',
      blue: '\x1b[94m',
      magenta: '\x1b[95m',
      cyan: '\x1b[96m',
    };

    const styleCode = style ? colors[style] || '' : '';
    const colorCode = colors[color] || '';
    const reset = colors.reset;

    return `${styleCode}${colorCode}${text}${reset}`;
  }
}
