/**
 * Core type definitions for the Aventura Game Engine
 * Based on the game specification JSON Schema
 */

// ============================================================================
// MEDIA ASSETS
// ============================================================================

export type MediaType = 'image' | 'video' | 'audio';
export type MediaRole = 'illustration' | 'background' | 'thumb' | 'video' | 'audio';

export interface MediaAssetMeta {
  width?: number;
  height?: number;
  duration?: number;
  prompt?: string;
  seed?: string;
  generator?: string;
  format?: string;
  [key: string]: unknown;
}

export interface MediaAsset {
  id: string;
  type: MediaType;
  src: string;
  alt?: string;
  meta?: MediaAssetMeta;
}

export interface MediaRef {
  asset_id: string;
  role?: MediaRole;
}

// ============================================================================
// GAME DEFINITIONS
// ============================================================================

export interface ItemDef {
  id: string;
  name: string;
  type: string;
  stackable: boolean;
  max_stack?: number;
  icon?: string;
  desc?: string;
}

export interface CurrencyDef {
  id: string;
  name: string;
  symbol?: string;
}

export interface StatDef {
  id: string;
  name: string;
  min: number;
  max: number;
  start: number;
}

// ============================================================================
// REQUIREMENTS (Conditions)
// ============================================================================

export type RequirementOp =
  | 'has_item'
  | 'inventory_lt'
  | 'currency_gte'
  | 'currency_lt'
  | 'stat_gte'
  | 'stat_between'
  | 'flag_is'
  | 'puzzle_solved'
  | 'visited_node';

export interface Requirement {
  op: RequirementOp;
  item_id?: string;
  qty?: number;
  currency_id?: string;
  value?: number | boolean;
  min?: number;
  max?: number;
  stat_id?: string;
  flag?: string;
  puzzle_id?: string;
  node_id?: string;
}

export interface RequirementAllOf {
  all_of: RequirementExpr[];
}

export interface RequirementAnyOf {
  any_of: RequirementExpr[];
}

export interface RequirementNot {
  not: RequirementExpr;
}

export type RequirementExpr =
  | Requirement
  | RequirementAllOf
  | RequirementAnyOf
  | RequirementNot;

// ============================================================================
// EFFECTS
// ============================================================================

export type EffectOp =
  | 'add_item'
  | 'remove_item'
  | 'add_currency'
  | 'add_stat'
  | 'set_flag'
  | 'log'
  | 'goto'
  | 'unlock_choice'
  | 'lock_choice'
  | 'set_timer'
  | 'loot_table';

export interface LootTableEntry {
  weight: number;
  effects: Effect[];
}

export interface Effect {
  op: EffectOp;
  item_id?: string;
  qty?: number;
  currency_id?: string;
  value?: number | boolean;
  stat_id?: string;
  flag?: string;
  message?: string;
  next_id?: string;
  node_id?: string;
  choice_index?: number;
  timer_flag?: string;
  expires_in_ms?: number;
  table?: LootTableEntry[];
}

// ============================================================================
// PUZZLES
// ============================================================================

export type PuzzleKind =
  | 'mcq'
  | 'text'
  | 'regex'
  | 'numeric'
  | 'article_de'
  | 'cloze_text'
  | 'matching'
  | 'ordering'
  | 'hotspot';

export type NormalizeMethod = 'trim' | 'lower' | 'ascii' | 'noaccents';
export type ArticleGender = 'der' | 'die' | 'das';
export type ArticleCase = 'NOM' | 'AKK' | 'DAT' | 'GEN';
export type HotspotShape = 'rect' | 'circle' | 'poly';

export interface PuzzleVariant {
  weight: number;
  override: Partial<Puzzle>;
}

export interface PuzzleDynamic {
  if_attempts_gt?: number;
  give_hint_cost?: {
    currency_id: string;
    value: number;
  };
  extra_time_ms?: number;
}

export interface PuzzleOutcome {
  effects?: Effect[];
  next_id?: string;
}

export interface PuzzleCommon {
  id: string;
  kind: PuzzleKind;
  prompt: string;
  media?: MediaRef[];
  time_limit_ms?: number;
  attempts_max?: number;
  hints?: string[];
  variants?: PuzzleVariant[];
  success?: PuzzleOutcome;
  failure?: PuzzleOutcome;
  gate_choices_until_solved?: boolean;
  dynamic?: PuzzleDynamic;
}

export interface PuzzleMCQ extends PuzzleCommon {
  kind: 'mcq';
  options: string[];
  multiple?: boolean;
  correct: number[];
  shuffle?: boolean;
}

export interface PuzzleText extends PuzzleCommon {
  kind: 'text';
  accepted_answers?: string[];
  normalize?: NormalizeMethod[];
}

export interface PuzzleRegex extends PuzzleCommon {
  kind: 'regex';
  pattern: string;
  flags?: string;
}

export interface PuzzleNumeric extends PuzzleCommon {
  kind: 'numeric';
  answer: number;
  tolerance?: number;
}

export interface PuzzleArticleDE extends PuzzleCommon {
  kind: 'article_de';
  noun: string;
  gender: ArticleGender;
  case?: ArticleCase;
}

export interface ClozeBlank {
  id: string;
  accepted_answers: string[];
  normalize?: NormalizeMethod[];
  weight?: number;
}

export interface PuzzleClozeText extends PuzzleCommon {
  kind: 'cloze_text';
  blanks: ClozeBlank[];
  shuffle_blanks?: boolean;
  partial_scoring?: boolean;
}

export interface PuzzleMatching extends PuzzleCommon {
  kind: 'matching';
  left: string[];
  right: string[];
  pairs: [number, number][];
  shuffle?: boolean;
  partial_scoring?: boolean;
}

export interface PuzzleOrdering extends PuzzleCommon {
  kind: 'ordering';
  options: string[];
  correct_order: number[];
  partial_scoring?: boolean;
}

export interface HotspotArea {
  id: string;
  shape: HotspotShape;
  coords: number[];
  correct?: boolean;
}

export interface PuzzleHotspot extends PuzzleCommon {
  kind: 'hotspot';
  media: MediaRef[];
  areas: HotspotArea[];
  allow_multiple?: boolean;
}

export type Puzzle =
  | PuzzleMCQ
  | PuzzleText
  | PuzzleRegex
  | PuzzleNumeric
  | PuzzleArticleDE
  | PuzzleClozeText
  | PuzzleMatching
  | PuzzleOrdering
  | PuzzleHotspot;

// ============================================================================
// NODES & CHOICES
// ============================================================================

export interface Choice {
  label: string;
  next_id: string;
  requirements?: RequirementExpr;
  effects?: Effect[];
  disabled_reason?: string;
}

export interface NodeOnEnter {
  effects: Effect[];
}

export interface Node {
  id: string;
  part: number;
  type?: 'ending';
  title: string;
  text: string;
  media?: MediaRef[];
  on_enter?: NodeOnEnter;
  puzzle?: Puzzle;
  choices?: Choice[];
}

// ============================================================================
// STORY
// ============================================================================

export interface Story {
  title: string;
  language: string;
  version: string;
  assets?: MediaAsset[];
  items?: ItemDef[];
  currencies?: CurrencyDef[];
  stats?: StatDef[];
  nodes: Node[];
}

// ============================================================================
// GAME STATE
// ============================================================================

export interface PuzzleState {
  solved: boolean;
  attempts: number;
  time_ms?: number;
  score?: number;
  last_answer?: unknown;
  solved_at?: number;
}

export interface TimerState {
  expiresAt: number;
}

export interface GameState {
  currentNodeId: string;
  visited: Record<string, boolean>;
  inventory: Record<string, number>;
  currencies: Record<string, number>;
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  puzzles: Record<string, PuzzleState>;
  timers: Record<string, TimerState>;
  lockedChoices?: Record<string, number[]>; // node_id -> choice indices
}

// ============================================================================
// PUZZLE EVALUATION
// ============================================================================

export interface PuzzleResult {
  correct: boolean;
  score?: number;
  message?: string;
  partialResults?: boolean[];
}
