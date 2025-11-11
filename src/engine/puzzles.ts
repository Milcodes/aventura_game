/**
 * Puzzle Engine
 * Evaluates puzzle answers and determines success/failure
 */

import {
  Puzzle,
  PuzzleMCQ,
  PuzzleText,
  PuzzleRegex,
  PuzzleNumeric,
  PuzzleArticleDE,
  PuzzleClozeText,
  PuzzleMatching,
  PuzzleOrdering,
  PuzzleHotspot,
  PuzzleResult,
  NormalizeMethod,
} from '../core/types';

// ============================================================================
// MAIN EVALUATION FUNCTION
// ============================================================================

/**
 * Evaluate a puzzle answer
 */
export function evaluatePuzzle(puzzle: Puzzle, answer: unknown): PuzzleResult {
  switch (puzzle.kind) {
    case 'mcq':
      return evaluateMCQ(puzzle, answer);

    case 'text':
      return evaluateText(puzzle, answer);

    case 'regex':
      return evaluateRegex(puzzle, answer);

    case 'numeric':
      return evaluateNumeric(puzzle, answer);

    case 'article_de':
      return evaluateArticleDE(puzzle, answer);

    case 'cloze_text':
      return evaluateClozeText(puzzle, answer);

    case 'matching':
      return evaluateMatching(puzzle, answer);

    case 'ordering':
      return evaluateOrdering(puzzle, answer);

    case 'hotspot':
      return evaluateHotspot(puzzle, answer);

    default:
      return {
        correct: false,
        message: `Unknown puzzle type: ${(puzzle as Puzzle).kind}`,
      };
  }
}

// ============================================================================
// PUZZLE TYPE EVALUATORS
// ============================================================================

/**
 * Evaluate Multiple Choice Question
 */
function evaluateMCQ(puzzle: PuzzleMCQ, answer: unknown): PuzzleResult {
  if (!Array.isArray(answer)) {
    return { correct: false, message: 'Answer must be an array of indices' };
  }

  const userAnswer = [...answer].sort((a, b) => a - b);
  const correctAnswer = [...puzzle.correct].sort((a, b) => a - b);

  const correct =
    userAnswer.length === correctAnswer.length &&
    userAnswer.every((val, idx) => val === correctAnswer[idx]);

  return {
    correct,
    score: correct ? 1 : 0,
  };
}

/**
 * Evaluate Text Answer
 */
function evaluateText(puzzle: PuzzleText, answer: unknown): PuzzleResult {
  if (typeof answer !== 'string') {
    return { correct: false, message: 'Answer must be a string' };
  }

  if (!puzzle.accepted_answers || puzzle.accepted_answers.length === 0) {
    // No accepted answers defined - accept anything non-empty
    return { correct: answer.trim().length > 0 };
  }

  const normalized = normalizeText(answer, puzzle.normalize || []);
  const correct = puzzle.accepted_answers.some((accepted) => {
    const normalizedAccepted = normalizeText(accepted, puzzle.normalize || []);
    return normalized === normalizedAccepted;
  });

  return {
    correct,
    score: correct ? 1 : 0,
  };
}

/**
 * Evaluate Regex Pattern
 */
function evaluateRegex(puzzle: PuzzleRegex, answer: unknown): PuzzleResult {
  if (typeof answer !== 'string') {
    return { correct: false, message: 'Answer must be a string' };
  }

  try {
    const regex = new RegExp(puzzle.pattern, puzzle.flags || '');
    const correct = regex.test(answer);
    return {
      correct,
      score: correct ? 1 : 0,
    };
  } catch (err) {
    return {
      correct: false,
      message: `Invalid regex pattern: ${err}`,
    };
  }
}

/**
 * Evaluate Numeric Answer
 */
function evaluateNumeric(puzzle: PuzzleNumeric, answer: unknown): PuzzleResult {
  const numAnswer = typeof answer === 'number' ? answer : parseFloat(String(answer));

  if (isNaN(numAnswer)) {
    return { correct: false, message: 'Answer must be a number' };
  }

  const tolerance = puzzle.tolerance || 0;
  const diff = Math.abs(numAnswer - puzzle.answer);
  const correct = diff <= tolerance;

  return {
    correct,
    score: correct ? 1 : 0,
  };
}

/**
 * Evaluate German Article
 */
function evaluateArticleDE(
  puzzle: PuzzleArticleDE,
  answer: unknown
): PuzzleResult {
  if (typeof answer !== 'string') {
    return { correct: false, message: 'Answer must be a string' };
  }

  const normalized = answer.trim().toLowerCase();
  const correct = normalized === puzzle.gender.toLowerCase();

  return {
    correct,
    score: correct ? 1 : 0,
  };
}

/**
 * Evaluate Cloze Text (fill in the blanks)
 */
function evaluateClozeText(
  puzzle: PuzzleClozeText,
  answer: unknown
): PuzzleResult {
  if (typeof answer !== 'object' || answer === null) {
    return {
      correct: false,
      message: 'Answer must be an object with blank_id -> answer mappings',
    };
  }

  const answerMap = answer as Record<string, string>;
  const results: boolean[] = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const blank of puzzle.blanks) {
    const weight = blank.weight || 1;
    totalWeight += weight;

    const userAnswer = answerMap[blank.id] || '';
    const normalized = normalizeText(userAnswer, blank.normalize || []);

    const blankCorrect = blank.accepted_answers.some((accepted) => {
      const normalizedAccepted = normalizeText(accepted, blank.normalize || []);
      return normalized === normalizedAccepted;
    });

    results.push(blankCorrect);
    if (blankCorrect) {
      earnedWeight += weight;
    }
  }

  const allCorrect = results.every((r) => r);
  const score = totalWeight > 0 ? earnedWeight / totalWeight : 0;

  return {
    correct: allCorrect,
    score,
    partialResults: results,
  };
}

/**
 * Evaluate Matching Puzzle
 */
function evaluateMatching(
  puzzle: PuzzleMatching,
  answer: unknown
): PuzzleResult {
  if (!Array.isArray(answer)) {
    return {
      correct: false,
      message: 'Answer must be an array of [left_index, right_index] pairs',
    };
  }

  const userPairs = answer as [number, number][];
  let correctCount = 0;

  for (const userPair of userPairs) {
    const isCorrect = puzzle.pairs.some(
      (correctPair) =>
        correctPair[0] === userPair[0] && correctPair[1] === userPair[1]
    );
    if (isCorrect) {
      correctCount++;
    }
  }

  const allCorrect = correctCount === puzzle.pairs.length;
  const score = puzzle.pairs.length > 0 ? correctCount / puzzle.pairs.length : 0;

  return {
    correct: allCorrect,
    score,
  };
}

/**
 * Evaluate Ordering Puzzle
 */
function evaluateOrdering(
  puzzle: PuzzleOrdering,
  answer: unknown
): PuzzleResult {
  if (!Array.isArray(answer)) {
    return {
      correct: false,
      message: 'Answer must be an array of indices',
    };
  }

  const userOrder = answer as number[];

  if (userOrder.length !== puzzle.correct_order.length) {
    return { correct: false, score: 0 };
  }

  let correctCount = 0;
  for (let i = 0; i < userOrder.length; i++) {
    if (userOrder[i] === puzzle.correct_order[i]) {
      correctCount++;
    }
  }

  const allCorrect = correctCount === puzzle.correct_order.length;
  const score =
    puzzle.correct_order.length > 0 ? correctCount / puzzle.correct_order.length : 0;

  return {
    correct: allCorrect,
    score,
  };
}

/**
 * Evaluate Hotspot Puzzle
 */
function evaluateHotspot(
  puzzle: PuzzleHotspot,
  answer: unknown
): PuzzleResult {
  if (!Array.isArray(answer)) {
    return {
      correct: false,
      message: 'Answer must be an array of selected area IDs',
    };
  }

  const selectedIds = answer as string[];
  const correctAreas = puzzle.areas.filter((area) => area.correct);
  const correctIds = correctAreas.map((area) => area.id);

  // Check if all correct areas were selected
  const allCorrectSelected = correctIds.every((id) => selectedIds.includes(id));

  // Check if no incorrect areas were selected
  const noIncorrectSelected = selectedIds.every((id) => correctIds.includes(id));

  const correct = allCorrectSelected && noIncorrectSelected;

  // Calculate partial score
  const correctSelections = selectedIds.filter((id) => correctIds.includes(id)).length;
  const totalCorrect = correctIds.length;
  const score = totalCorrect > 0 ? correctSelections / totalCorrect : 0;

  return {
    correct,
    score,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize text based on specified methods
 */
function normalizeText(text: string, methods: NormalizeMethod[]): string {
  let result = text;

  for (const method of methods) {
    switch (method) {
      case 'trim':
        result = result.trim();
        break;

      case 'lower':
        result = result.toLowerCase();
        break;

      case 'ascii':
        // Remove non-ASCII characters
        result = result.replace(/[^\x00-\x7F]/g, '');
        break;

      case 'noaccents':
        // Remove diacritics/accents
        result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        break;
    }
  }

  return result;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Select a variant based on weights
 */
export function selectVariant<T extends { weight: number }>(
  variants: T[]
): T | undefined {
  if (variants.length === 0) {
    return undefined;
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant;
    }
  }

  return variants[0];
}
