/**
 * Timeline Adapter - Transforms data between Timeline Editor and Backend
 *
 * Timeline Editor uses:
 * - Relative position (t: 0-1) for mainline
 * - SVG coordinates (x, y) for visual positioning
 * - Parent structure for entry points
 * - Terminal flag for death
 *
 * Backend uses:
 * - Absolute order (1, 2, 3...) for nodes
 * - Entry/Exit node IDs
 * - Branch nesting with parentBranchId
 * - ExitType enum (NODE or DEATH)
 */

import {
  Story,
  StoryNode,
  Branch,
  CreateStoryNodeDto,
  CreateBranchDto,
  BranchType,
  ExitType,
} from '../api/stories';

// ============= TIMELINE TYPES (from TimelineEditor.tsx) =============

export type Point = { x: number; y: number };

export type TimelineParent =
  | { kind: 'main'; t: number }
  | { kind: 'branch'; id: string; pointIndex: number };

export type TimelineMainEvent = {
  id: string;
  t: number; // 0-1 (relative position on mainline)
  type: 'quiz' | 'note' | 'dice' | 'combat' | 'memory' | 'shop' | 'decision';
  title: string;
  description: string;
};

export type TimelineBranchEvent = {
  id: string;
  nodeIndex: number; // Index in points array
  type: 'quiz' | 'note' | 'dice' | 'combat' | 'memory' | 'shop' | 'decision';
  title: string;
  description: string;
};

export type TimelineBranch = {
  id: string;
  title: string;
  terminal: boolean; // If true, branch ends in death (no return)
  parent: TimelineParent;
  points: Point[]; // SVG coordinates for visual positioning
  depth: number; // 0-5 (but backend max is 3)
  events: TimelineBranchEvent[];
};

export type TimelineData = {
  events: TimelineMainEvent[];
  branches: TimelineBranch[];
};

// ============= TRANSFORMATION RESULTS =============

export type BackendTransformResult = {
  mainlineNodes: CreateStoryNodeDto[];
  branchNodes: CreateStoryNodeDto[];
  branches: CreateBranchDto[];
};

export type ValidationError = {
  type: 'error' | 'warning';
  message: string;
  path?: string; // e.g., "branch.kastely.depth"
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

// ============= TRANSFORMATION OPTIONS =============

export type TransformOptions = {
  storyId: string;
  maxDepth?: number; // Default 3 (backend limit)
  maxNodesPerBranch?: number; // Default 100
  minMainlineNodes?: number; // Default 3
};

// ============= HELPER TYPES =============

export type NodeMapping = {
  timelineId: string; // Timeline event/node ID
  backendId: string; // Backend StoryNode ID
  type: 'mainline' | 'branch';
  order?: number; // For mainline nodes
  branchId?: string; // For branch nodes
};

export type BranchMapping = {
  timelineId: string; // Timeline branch ID
  backendId: string; // Backend Branch ID
  depth: number;
};
