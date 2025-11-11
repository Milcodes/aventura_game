#!/usr/bin/env node

/**
 * Console Player Example
 * Simple CLI-based interactive story player
 */

import * as readline from 'readline';
import * as path from 'path';
import { GameEngine, GameEvent } from '../engine/engine';
import { ConsoleRenderer } from '../engine/renderer';
import { loadStoryFromFileSync } from '../engine/loader';
import { saveStateToLocalStorage, loadStateFromLocalStorage } from '../engine/state';
import { Node } from '../core/types';

// Console readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Game state
let engine: GameEngine;
let renderer: ConsoleRenderer;
let currentPuzzle: any = null;
let gameEnded = false;

/**
 * Main entry point
 */
async function main() {
  console.clear();
  console.log('='.repeat(60));
  console.log('  AVENTURA GAME - Console Player');
  console.log('='.repeat(60));

  // Load story
  const storyPath = process.argv[2] || path.join(__dirname, '../../stories/demo.json');
  console.log(`\nLoading story from: ${storyPath}`);

  try {
    const story = loadStoryFromFileSync(storyPath);
    console.log(`Loaded: ${story.title} (${story.version})`);

    // Create renderer
    renderer = new ConsoleRenderer(true);

    // Create engine
    engine = new GameEngine(story);

    // Setup event listeners
    setupEventListeners();

    // Start game
    console.log('\nStarting game...\n');
    engine.start();

    // Main game loop
    await gameLoop();
  } catch (err) {
    console.error('Error loading story:', err);
    process.exit(1);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  engine.on((event: GameEvent) => {
    switch (event.type) {
      case 'node_entered':
        handleNodeEntered(event.node);
        break;

      case 'puzzle_started':
        currentPuzzle = event.puzzle;
        renderer.renderPuzzle(event.puzzle);
        break;

      case 'puzzle_completed':
        renderer.displayPuzzleResult(event.result, event.success);
        currentPuzzle = event.success ? null : currentPuzzle;
        break;

      case 'effects_applied':
        if (event.effects.logs.length > 0) {
          event.effects.logs.forEach((log) => renderer.displayMessage(log, 'info'));
        }
        break;

      case 'game_ended':
        gameEnded = true;
        renderer.showEnding(event.node);
        break;
    }
  });
}

/**
 * Handle node entered event
 */
function handleNodeEntered(node: Node) {
  renderer.renderNode(node);

  if (node.media) {
    renderer.renderMedia(node.media);
  }

  if (!node.puzzle && node.choices) {
    const availableChoices = engine.getAvailableChoices();
    renderer.renderChoices(availableChoices);
  }
}

/**
 * Main game loop
 */
async function gameLoop() {
  while (!gameEnded) {
    const input = await prompt('\nYour choice: ');

    if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
      console.log('\nGoodbye!');
      process.exit(0);
    }

    if (input.toLowerCase() === 'state') {
      renderer.renderHUD(engine.getState());
      continue;
    }

    if (input.toLowerCase() === 'save') {
      try {
        saveStateToLocalStorage(engine.getState());
        renderer.displayMessage('Game saved!', 'success');
      } catch (err) {
        renderer.displayMessage('Failed to save game', 'error');
      }
      continue;
    }

    if (input.toLowerCase() === 'load') {
      try {
        const state = loadStateFromLocalStorage();
        if (state) {
          engine.loadState(state);
          renderer.displayMessage('Game loaded!', 'success');
          engine.start();
        } else {
          renderer.displayMessage('No saved game found', 'warning');
        }
      } catch (err) {
        renderer.displayMessage('Failed to load game', 'error');
      }
      continue;
    }

    if (input.toLowerCase() === 'help') {
      showHelp();
      continue;
    }

    // Handle puzzle input
    if (currentPuzzle) {
      handlePuzzleInput(input);
      continue;
    }

    // Handle choice selection
    const choiceIndex = parseInt(input, 10) - 1;
    if (isNaN(choiceIndex)) {
      renderer.displayMessage('Invalid input. Enter a number or "help"', 'warning');
      continue;
    }

    const availableChoices = engine.getAvailableChoices();
    if (choiceIndex < 0 || choiceIndex >= availableChoices.length) {
      renderer.displayMessage('Invalid choice number', 'warning');
      continue;
    }

    if (!availableChoices[choiceIndex].available) {
      renderer.displayMessage(
        `Choice not available: ${availableChoices[choiceIndex].reason}`,
        'warning'
      );
      continue;
    }

    engine.makeChoice(choiceIndex);
  }

  // Game ended
  const playAgain = await prompt('\nPlay again? (y/n): ');
  if (playAgain.toLowerCase() === 'y' || playAgain.toLowerCase() === 'yes') {
    gameEnded = false;
    engine.reset();
    engine.start();
    await gameLoop();
  } else {
    console.log('\nThanks for playing!');
    process.exit(0);
  }
}

/**
 * Handle puzzle input
 */
function handlePuzzleInput(input: string) {
  if (!currentPuzzle) return;

  let answer: any;

  switch (currentPuzzle.kind) {
    case 'mcq':
      // Parse comma-separated indices
      answer = input.split(',').map((s) => parseInt(s.trim(), 10) - 1);
      break;

    case 'text':
    case 'regex':
    case 'article_de':
      answer = input;
      break;

    case 'numeric':
      answer = parseFloat(input);
      break;

    case 'cloze_text':
      // Parse format: b1=answer1, b2=answer2
      answer = {};
      input.split(',').forEach((pair) => {
        const [key, value] = pair.split('=').map((s) => s.trim());
        if (key && value) {
          answer[key] = value;
        }
      });
      break;

    case 'matching':
      // Parse format: 0-1, 1-2, 2-0
      answer = input.split(',').map((pair) => {
        const [left, right] = pair.split('-').map((s) => parseInt(s.trim(), 10));
        return [left, right];
      });
      break;

    case 'ordering':
      // Parse comma-separated indices
      answer = input.split(',').map((s) => parseInt(s.trim(), 10));
      break;

    case 'hotspot':
      // Parse comma-separated area IDs
      answer = input.split(',').map((s) => s.trim());
      break;

    default:
      renderer.displayMessage('Unsupported puzzle type', 'error');
      return;
  }

  engine.solvePuzzle(answer);

  // Show choices after puzzle is solved
  const node = engine.getCurrentNode();
  if (node && node.choices && !currentPuzzle) {
    const availableChoices = engine.getAvailableChoices();
    renderer.renderChoices(availableChoices);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log('\n[Commands]');
  console.log('  <number>   - Select choice (1, 2, 3, ...)');
  console.log('  state      - Show game state');
  console.log('  save       - Save game');
  console.log('  load       - Load saved game');
  console.log('  help       - Show this help');
  console.log('  quit/exit  - Quit game');
  console.log('\n[Puzzle Answers]');
  console.log('  MCQ:       Enter indices (e.g., 1 or 1,2)');
  console.log('  Text:      Enter text answer');
  console.log('  Numeric:   Enter number');
  console.log('  Article:   Enter article (der, die, das)');
  console.log('  Cloze:     Enter b1=answer1, b2=answer2');
  console.log('  Matching:  Enter 0-1, 1-2, 2-0');
  console.log('  Ordering:  Enter 0, 1, 2');
  console.log('  Hotspot:   Enter area IDs (e.g., a1, a2)');
}

/**
 * Prompt for input
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Run main
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
