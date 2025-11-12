/**
 * Timeline Adapter - Core transformation logic
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Story,
  StoryNode,
  Branch,
  CreateStoryNodeDto,
  CreateBranchDto,
  BranchType,
  ExitType,
} from '../api/stories';
import {
  TimelineData,
  TimelineMainEvent,
  TimelineBranch,
  TimelineParent,
  BackendTransformResult,
  ValidationResult,
  ValidationError,
  TransformOptions,
  NodeMapping,
  BranchMapping,
} from './timelineAdapter.types';

// ============= CONSTANTS =============

const DEFAULT_OPTIONS: Required<TransformOptions> = {
  storyId: '',
  maxDepth: 3,
  maxNodesPerBranch: 100,
  minMainlineNodes: 3,
};

// ============= HELPER FUNCTIONS =============

/**
 * Convert relative position (t: 0-1) to absolute order (1, 2, 3...)
 */
export function tToOrder(t: number, maxOrder: number): number {
  if (maxOrder === 1) return 1;
  return Math.round(t * (maxOrder - 1)) + 1;
}

/**
 * Convert absolute order to relative position (t: 0-1)
 */
export function orderToT(order: number, maxOrder: number): number {
  if (maxOrder === 1) return 0.5; // Middle position for single node
  return (order - 1) / (maxOrder - 1);
}

/**
 * Generate unique ID for timeline elements
 */
export function generateTimelineId(): string {
  return `timeline-${uuidv4()}`;
}

/**
 * Calculate branch depth from parent
 */
export function calculateBranchDepth(
  parentBranchId: string | undefined,
  branches: Branch[]
): number {
  if (!parentBranchId) return 1; // Top-level branch

  const parent = branches.find((b) => b.id === parentBranchId);
  return parent ? parent.depth + 1 : 1;
}

/**
 * Find node by ID in mainline or branches
 */
export function findNodeById(
  nodeId: string,
  mainlineNodes: StoryNode[],
  branches: Branch[]
): StoryNode | null {
  // Check mainline
  const mainlineNode = mainlineNodes.find((n) => n.id === nodeId);
  if (mainlineNode) return mainlineNode;

  // Check branches
  for (const branch of branches) {
    if (branch.nodes) {
      const branchNode = branch.nodes.find((n) => n.id === nodeId);
      if (branchNode) return branchNode;
    }
  }

  return null;
}

// ============= VALIDATION =============

/**
 * Validate timeline data before transforming to backend
 */
export function validateTimelineForBackend(
  timeline: TimelineData,
  options: Partial<TransformOptions> = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];

  // Check minimum mainline events
  if (timeline.events.length < opts.minMainlineNodes) {
    errors.push({
      type: 'error',
      message: `Minimum ${opts.minMainlineNodes} mainline events required (found ${timeline.events.length})`,
      path: 'events',
    });
  }

  // Check each branch
  timeline.branches.forEach((branch, index) => {
    const branchPath = `branches[${index}]`;

    // Check max depth
    if (branch.depth > opts.maxDepth) {
      errors.push({
        type: 'error',
        message: `Branch "${branch.title}" exceeds maximum depth ${opts.maxDepth} (found ${branch.depth})`,
        path: `${branchPath}.depth`,
      });
    }

    // Check max nodes per branch
    if (branch.events.length > opts.maxNodesPerBranch) {
      errors.push({
        type: 'error',
        message: `Branch "${branch.title}" exceeds maximum ${opts.maxNodesPerBranch} nodes (found ${branch.events.length})`,
        path: `${branchPath}.events`,
      });
    }

    // Check minimum points (entry + at least 1 point)
    if (branch.points.length < 2) {
      errors.push({
        type: 'error',
        message: `Branch "${branch.title}" must have at least 2 points (entry + 1 node)`,
        path: `${branchPath}.points`,
      });
    }

    // Warn if terminal is false but no clear reconnection
    if (!branch.terminal && branch.points.length > 0) {
      const lastPoint = branch.points[branch.points.length - 1];
      const isReconnectedToMain = lastPoint.x === 140; // mainX constant from TimelineEditor

      if (!isReconnectedToMain) {
        errors.push({
          type: 'warning',
          message: `Branch "${branch.title}" is not terminal but doesn't reconnect to mainline`,
          path: `${branchPath}.terminal`,
        });
      }
    }
  });

  return {
    valid: errors.filter((e) => e.type === 'error').length === 0,
    errors,
  };
}

// ============= BACKEND → TIMELINE TRANSFORMATION =============

/**
 * Transform backend Story data to Timeline Editor format
 */
export function backendToTimeline(story: Story): TimelineData {
  const mainlineNodes = (story.nodes || [])
    .filter((n) => !n.branchId)
    .sort((a, b) => a.order - b.order);

  const branches = story.branches || [];

  // Transform mainline nodes to timeline events
  const maxOrder = Math.max(...mainlineNodes.map((n) => n.order), 1);
  const timelineEvents: TimelineMainEvent[] = mainlineNodes.map((node) => ({
    id: node.id,
    t: orderToT(node.order, maxOrder),
    type: extractEventType(node),
    title: node.label,
    description: node.storyText || '',
  }));

  // Transform branches
  const timelineBranches: TimelineBranch[] = branches.map((branch) =>
    transformBranchToTimeline(branch, mainlineNodes, branches)
  );

  return {
    events: timelineEvents,
    branches: timelineBranches,
  };
}

/**
 * Transform a single backend Branch to Timeline format
 */
function transformBranchToTimeline(
  branch: Branch,
  mainlineNodes: StoryNode[],
  allBranches: Branch[]
): TimelineBranch {
  const branchNodes = (branch.nodes || []).sort((a, b) => a.order - b.order);

  // Calculate entry point
  const entryNode = findNodeById(branch.entryNodeId, mainlineNodes, allBranches);
  const parent: TimelineParent = entryNode?.branchId
    ? {
        kind: 'branch',
        id: entryNode.branchId,
        pointIndex: calculatePointIndexForNode(entryNode, branch),
      }
    : {
        kind: 'main',
        t: entryNode ? orderToT(entryNode.order, mainlineNodes.length) : 0.5,
      };

  // Generate points (simplified - just entry, middle points, exit)
  const points = generatePointsForBranch(branch, parent, branchNodes.length);

  // Transform branch events
  const events = branchNodes.map((node, index) => ({
    id: node.id,
    nodeIndex: index + 1, // +1 because first point is entry
    type: extractEventType(node),
    title: node.label,
    description: node.storyText || '',
  }));

  return {
    id: branch.id,
    title: branch.name,
    terminal: branch.exitType === ExitType.DEATH,
    parent,
    points,
    depth: branch.depth,
    events,
  };
}

/**
 * Extract event type from node decisions
 */
function extractEventType(node: StoryNode): TimelineMainEvent['type'] {
  // Check if node has decisions with modalType
  const decisions = Array.isArray(node.decisions) ? node.decisions : [];

  if (decisions.length > 0 && decisions[0].modalType) {
    return decisions[0].modalType as TimelineMainEvent['type'];
  }

  // Default to 'note'
  return 'note';
}

/**
 * Calculate point index for a node within a branch
 */
function calculatePointIndexForNode(node: StoryNode, branch: Branch): number {
  const nodes = (branch.nodes || []).sort((a, b) => a.order - b.order);
  const index = nodes.findIndex((n) => n.id === node.id);
  return index >= 0 ? index + 1 : 0; // +1 because first point is entry
}

/**
 * Generate SVG points for visual representation
 * This is simplified - actual positions should be calculated based on layout
 */
function generatePointsForBranch(
  branch: Branch,
  parent: TimelineParent,
  nodeCount: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  // Entry point
  const mainX = 140;
  const topY = 60;
  const bottomY = 520;

  if (parent.kind === 'main') {
    const entryY = topY + parent.t * (bottomY - topY);
    points.push({ x: mainX, y: entryY });
  } else {
    // For branch-to-branch, use a default position
    points.push({ x: mainX + 100 * branch.depth, y: topY + 100 });
  }

  // Middle points (one for each node)
  const xOffset = 150 + branch.depth * 50;
  for (let i = 0; i < nodeCount; i++) {
    const yOffset = topY + ((i + 1) / (nodeCount + 1)) * (bottomY - topY);
    points.push({ x: mainX + xOffset, y: yOffset });
  }

  // Exit point (reconnect to mainline or terminal)
  if (branch.exitType === ExitType.DEATH) {
    // Terminal - end at current position
    const lastPoint = points[points.length - 1];
    points.push({ x: lastPoint.x + 50, y: lastPoint.y });
  } else {
    // Reconnect to mainline
    const exitY = bottomY - 50; // Default reconnection point
    points.push({ x: mainX, y: exitY });
  }

  return points;
}

// ============= TIMELINE → BACKEND TRANSFORMATION =============

/**
 * Transform Timeline Editor data to Backend format
 */
export function timelineToBackend(
  timeline: TimelineData,
  options: TransformOptions
): BackendTransformResult {
  const { storyId } = options;

  // Create ID mappings
  const nodeMappings: NodeMapping[] = [];
  const branchMappings: BranchMapping[] = [];

  // Transform mainline events to nodes
  const mainlineNodes: CreateStoryNodeDto[] = timeline.events.map((event, index) => {
    const backendId = uuidv4();
    nodeMappings.push({
      timelineId: event.id,
      backendId,
      type: 'mainline',
      order: index + 1,
    });

    return {
      storyId,
      order: index + 1,
      label: event.title,
      storyText: event.description || '',
      decisions: [],
      effects: [],
    };
  });

  // Transform branches
  const branches: CreateBranchDto[] = [];
  const branchNodes: CreateStoryNodeDto[] = [];

  timeline.branches.forEach((timelineBranch) => {
    const branchBackendId = uuidv4();
    branchMappings.push({
      timelineId: timelineBranch.id,
      backendId: branchBackendId,
      depth: timelineBranch.depth,
    });

    // Find entry node ID
    const entryNodeId = resolveEntryNodeId(
      timelineBranch.parent,
      mainlineNodes,
      nodeMappings,
      branchMappings
    );

    // Calculate exit node IDs
    const exitNodeIds = timelineBranch.terminal
      ? ['DEATH']
      : resolveExitNodeIds(timelineBranch, mainlineNodes, nodeMappings);

    // Create branch DTO
    branches.push({
      storyId,
      name: timelineBranch.title,
      type: BranchType.LOCATION, // Default type
      entryNodeId,
      exitNodeIds,
      exitType: timelineBranch.terminal ? ExitType.DEATH : ExitType.NODE,
      parentBranchId: timelineBranch.parent.kind === 'branch' ? timelineBranch.parent.id : undefined,
      depth: Math.min(timelineBranch.depth, 3), // Enforce max depth 3
    });

    // Create branch nodes
    timelineBranch.events.forEach((event, index) => {
      const nodeBackendId = uuidv4();
      nodeMappings.push({
        timelineId: event.id,
        backendId: nodeBackendId,
        type: 'branch',
        branchId: branchBackendId,
      });

      branchNodes.push({
        storyId,
        branchId: branchBackendId,
        order: index + 1,
        label: event.title,
        storyText: event.description || '',
        decisions: [],
        effects: [],
      });
    });
  });

  return {
    mainlineNodes,
    branchNodes,
    branches,
  };
}

/**
 * Resolve entry node ID from timeline parent
 */
function resolveEntryNodeId(
  parent: TimelineParent,
  mainlineNodes: CreateStoryNodeDto[],
  nodeMappings: NodeMapping[],
  branchMappings: BranchMapping[]
): string {
  if (parent.kind === 'main') {
    // Find mainline node closest to t position
    const targetOrder = tToOrder(parent.t, mainlineNodes.length);
    const closestNode = mainlineNodes[Math.min(targetOrder - 1, mainlineNodes.length - 1)];

    // Find mapping
    const mapping = nodeMappings.find((m) => m.order === closestNode.order);
    return mapping?.backendId || mainlineNodes[0].storyId; // Fallback to first node
  } else {
    // Branch parent - find the branch and its node at pointIndex
    const branchMapping = branchMappings.find((m) => m.timelineId === parent.id);
    if (branchMapping) {
      // Find node at pointIndex
      const branchNodeMapping = nodeMappings.find(
        (m) => m.type === 'branch' && m.branchId === branchMapping.backendId
      );
      return branchNodeMapping?.backendId || '';
    }
    return '';
  }
}

/**
 * Resolve exit node IDs for non-terminal branches
 */
function resolveExitNodeIds(
  branch: TimelineBranch,
  mainlineNodes: CreateStoryNodeDto[],
  nodeMappings: NodeMapping[]
): string[] {
  // Find the last point and check if it reconnects to mainline
  const lastPoint = branch.points[branch.points.length - 1];
  const mainX = 140;

  if (Math.abs(lastPoint.x - mainX) < 10) {
    // Reconnects to mainline - find closest node
    const topY = 60;
    const bottomY = 520;
    const t = (lastPoint.y - topY) / (bottomY - topY);
    const targetOrder = tToOrder(t, mainlineNodes.length);
    const mapping = nodeMappings.find((m) => m.order === targetOrder);

    return mapping ? [mapping.backendId] : [nodeMappings[nodeMappings.length - 1].backendId];
  }

  // Default: reconnect to last mainline node
  return [nodeMappings[nodeMappings.length - 1].backendId];
}
