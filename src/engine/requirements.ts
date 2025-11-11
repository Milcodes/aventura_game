/**
 * Requirements Evaluator
 * Evaluates complex requirement expressions with logical composition
 */

import {
  RequirementExpr,
  Requirement,
  RequirementAllOf,
  RequirementAnyOf,
  RequirementNot,
  GameState,
  Story,
} from '../core/types';

/**
 * Evaluate a requirement expression against the current game state
 */
export function evaluateRequirement(
  expr: RequirementExpr | undefined,
  state: GameState,
  story: Story
): boolean {
  if (!expr) {
    return true;
  }

  // Check for logical composition
  if ('all_of' in expr) {
    return evaluateAllOf(expr, state, story);
  }
  if ('any_of' in expr) {
    return evaluateAnyOf(expr, state, story);
  }
  if ('not' in expr) {
    return evaluateNot(expr, state, story);
  }

  // Simple requirement
  return evaluateSimpleRequirement(expr as Requirement, state, story);
}

/**
 * Evaluate all_of (AND) logic
 */
function evaluateAllOf(
  expr: RequirementAllOf,
  state: GameState,
  story: Story
): boolean {
  return expr.all_of.every((subExpr) =>
    evaluateRequirement(subExpr, state, story)
  );
}

/**
 * Evaluate any_of (OR) logic
 */
function evaluateAnyOf(
  expr: RequirementAnyOf,
  state: GameState,
  story: Story
): boolean {
  return expr.any_of.some((subExpr) =>
    evaluateRequirement(subExpr, state, story)
  );
}

/**
 * Evaluate not (negation) logic
 */
function evaluateNot(expr: RequirementNot, state: GameState, story: Story): boolean {
  return !evaluateRequirement(expr.not, state, story);
}

/**
 * Evaluate a simple requirement operation
 */
function evaluateSimpleRequirement(
  req: Requirement,
  state: GameState,
  _story: Story
): boolean {
  switch (req.op) {
    case 'has_item':
      return evaluateHasItem(req, state);

    case 'inventory_lt':
      return evaluateInventoryLt(req, state);

    case 'currency_gte':
      return evaluateCurrencyGte(req, state);

    case 'currency_lt':
      return evaluateCurrencyLt(req, state);

    case 'stat_gte':
      return evaluateStatGte(req, state);

    case 'stat_between':
      return evaluateStatBetween(req, state);

    case 'flag_is':
      return evaluateFlagIs(req, state);

    case 'puzzle_solved':
      return evaluatePuzzleSolved(req, state);

    case 'visited_node':
      return evaluateVisitedNode(req, state);

    default:
      console.warn(`Unknown requirement operation: ${(req as Requirement).op}`);
      return false;
  }
}

// ============================================================================
// SIMPLE REQUIREMENT EVALUATORS
// ============================================================================

function evaluateHasItem(req: Requirement, state: GameState): boolean {
  if (!req.item_id || req.qty === undefined) {
    return false;
  }
  const count = state.inventory[req.item_id] || 0;
  return count >= req.qty;
}

function evaluateInventoryLt(req: Requirement, state: GameState): boolean {
  if (!req.item_id || req.qty === undefined) {
    return false;
  }
  const count = state.inventory[req.item_id] || 0;
  return count < req.qty;
}

function evaluateCurrencyGte(req: Requirement, state: GameState): boolean {
  if (!req.currency_id || req.value === undefined) {
    return false;
  }
  const amount = state.currencies[req.currency_id] || 0;
  return amount >= (req.value as number);
}

function evaluateCurrencyLt(req: Requirement, state: GameState): boolean {
  if (!req.currency_id || req.value === undefined) {
    return false;
  }
  const amount = state.currencies[req.currency_id] || 0;
  return amount < (req.value as number);
}

function evaluateStatGte(req: Requirement, state: GameState): boolean {
  if (!req.stat_id || req.value === undefined) {
    return false;
  }
  const statValue = state.stats[req.stat_id] || 0;
  return statValue >= (req.value as number);
}

function evaluateStatBetween(req: Requirement, state: GameState): boolean {
  if (!req.stat_id || req.min === undefined || req.max === undefined) {
    return false;
  }
  const statValue = state.stats[req.stat_id] || 0;
  return statValue >= req.min && statValue <= req.max;
}

function evaluateFlagIs(req: Requirement, state: GameState): boolean {
  if (!req.flag || req.value === undefined) {
    return false;
  }
  const flagValue = state.flags[req.flag] || false;
  return flagValue === Boolean(req.value);
}

function evaluatePuzzleSolved(req: Requirement, state: GameState): boolean {
  if (!req.puzzle_id) {
    return false;
  }
  const puzzleState = state.puzzles[req.puzzle_id];
  return puzzleState?.solved || false;
}

function evaluateVisitedNode(req: Requirement, state: GameState): boolean {
  if (!req.node_id) {
    return false;
  }
  return state.visited[req.node_id] || false;
}

/**
 * Check if a timer is still active (not expired)
 */
export function isTimerActive(timerFlag: string, state: GameState): boolean {
  const timer = state.timers[timerFlag];
  if (!timer) {
    return false;
  }
  return Date.now() < timer.expiresAt;
}
