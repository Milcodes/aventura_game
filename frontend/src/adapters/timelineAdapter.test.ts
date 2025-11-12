/**
 * Timeline Adapter Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  tToOrder,
  orderToT,
  calculateBranchDepth,
  validateTimelineForBackend,
  backendToTimeline,
  timelineToBackend,
} from './timelineAdapter';
import {
  TimelineData,
  TimelineMainEvent,
  TimelineBranch,
} from './timelineAdapter.types';
import {
  Story,
  StoryNode,
  Branch,
  BranchType,
  ExitType,
  StoryStatus,
} from '../api/stories';

// ============= HELPER FUNCTIONS TESTS =============

describe('tToOrder', () => {
  it('should convert t=0 to order=1', () => {
    expect(tToOrder(0, 5)).toBe(1);
  });

  it('should convert t=1 to maxOrder', () => {
    expect(tToOrder(1, 5)).toBe(5);
  });

  it('should convert t=0.5 to middle order', () => {
    expect(tToOrder(0.5, 5)).toBe(3);
  });

  it('should handle single node case', () => {
    expect(tToOrder(0.5, 1)).toBe(1);
  });

  it('should round to nearest order', () => {
    expect(tToOrder(0.25, 5)).toBe(2);
    expect(tToOrder(0.75, 5)).toBe(4);
  });
});

describe('orderToT', () => {
  it('should convert order=1 to t=0', () => {
    expect(orderToT(1, 5)).toBe(0);
  });

  it('should convert maxOrder to t=1', () => {
    expect(orderToT(5, 5)).toBe(1);
  });

  it('should convert middle order to t=0.5', () => {
    expect(orderToT(3, 5)).toBe(0.5);
  });

  it('should handle single node case', () => {
    expect(orderToT(1, 1)).toBe(0.5);
  });

  it('should produce values between 0 and 1', () => {
    expect(orderToT(2, 5)).toBeGreaterThanOrEqual(0);
    expect(orderToT(2, 5)).toBeLessThanOrEqual(1);
  });
});

describe('calculateBranchDepth', () => {
  it('should return 1 for top-level branch (no parent)', () => {
    expect(calculateBranchDepth(undefined, [])).toBe(1);
  });

  it('should return parent depth + 1', () => {
    const branches: Branch[] = [
      {
        id: 'parent-1',
        storyId: 'story-1',
        name: 'Parent Branch',
        type: BranchType.LOCATION,
        entryNodeId: 'node-1',
        exitNodeIds: ['node-2'],
        exitType: ExitType.NODE,
        depth: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    expect(calculateBranchDepth('parent-1', branches)).toBe(2);
  });

  it('should return 1 if parent not found', () => {
    expect(calculateBranchDepth('non-existent', [])).toBe(1);
  });
});

// ============= VALIDATION TESTS =============

describe('validateTimelineForBackend', () => {
  it('should pass validation for valid timeline', () => {
    const timeline: TimelineData = {
      events: [
        { id: '1', t: 0, type: 'note', title: 'Start', description: '' },
        { id: '2', t: 0.5, type: 'quiz', title: 'Middle', description: '' },
        { id: '3', t: 1, type: 'note', title: 'End', description: '' },
      ],
      branches: [],
    };

    const result = validateTimelineForBackend(timeline, { storyId: 'test', minMainlineNodes: 3 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation if less than minimum mainline events', () => {
    const timeline: TimelineData = {
      events: [
        { id: '1', t: 0, type: 'note', title: 'Start', description: '' },
        { id: '2', t: 1, type: 'note', title: 'End', description: '' },
      ],
      branches: [],
    };

    const result = validateTimelineForBackend(timeline, { storyId: 'test', minMainlineNodes: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'error' && e.path === 'events')).toBe(true);
  });

  it('should fail validation if branch exceeds max depth', () => {
    const timeline: TimelineData = {
      events: [
        { id: '1', t: 0, type: 'note', title: 'Start', description: '' },
        { id: '2', t: 0.5, type: 'note', title: 'Middle', description: '' },
        { id: '3', t: 1, type: 'note', title: 'End', description: '' },
      ],
      branches: [
        {
          id: 'branch-1',
          title: 'Deep Branch',
          terminal: false,
          parent: { kind: 'main', t: 0.5 },
          points: [
            { x: 140, y: 100 },
            { x: 300, y: 200 },
            { x: 140, y: 300 },
          ],
          depth: 5, // Exceeds max depth 3
          events: [],
        },
      ],
    };

    const result = validateTimelineForBackend(timeline, { storyId: 'test', maxDepth: 3 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'error' && e.message.includes('depth'))).toBe(true);
  });

  it('should fail validation if branch exceeds max nodes', () => {
    const timeline: TimelineData = {
      events: [
        { id: '1', t: 0, type: 'note', title: 'Start', description: '' },
        { id: '2', t: 0.5, type: 'note', title: 'Middle', description: '' },
        { id: '3', t: 1, type: 'note', title: 'End', description: '' },
      ],
      branches: [
        {
          id: 'branch-1',
          title: 'Big Branch',
          terminal: false,
          parent: { kind: 'main', t: 0.5 },
          points: [{ x: 140, y: 100 }, { x: 300, y: 200 }],
          depth: 1,
          events: Array(101).fill(null).map((_, i) => ({
            id: `event-${i}`,
            nodeIndex: i,
            type: 'note' as const,
            title: `Event ${i}`,
            description: '',
          })),
        },
      ],
    };

    const result = validateTimelineForBackend(timeline, { storyId: 'test', maxNodesPerBranch: 100 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'error' && e.message.includes('100 nodes'))).toBe(true);
  });

  it('should warn if branch not terminal and not reconnected', () => {
    const timeline: TimelineData = {
      events: [
        { id: '1', t: 0, type: 'note', title: 'Start', description: '' },
        { id: '2', t: 0.5, type: 'note', title: 'Middle', description: '' },
        { id: '3', t: 1, type: 'note', title: 'End', description: '' },
      ],
      branches: [
        {
          id: 'branch-1',
          title: 'Floating Branch',
          terminal: false,
          parent: { kind: 'main', t: 0.5 },
          points: [
            { x: 140, y: 100 },
            { x: 300, y: 200 }, // Doesn't reconnect to mainline (x != 140)
          ],
          depth: 1,
          events: [],
        },
      ],
    };

    const result = validateTimelineForBackend(timeline, { storyId: 'test' });
    expect(result.errors.some((e) => e.type === 'warning' && e.message.includes('reconnect'))).toBe(true);
  });
});

// ============= BACKEND → TIMELINE TRANSFORMATION TESTS =============

describe('backendToTimeline', () => {
  it('should transform mainline nodes to timeline events', () => {
    const story: Story = {
      id: 'story-1',
      title: 'Test Story',
      language: 'hu',
      version: 1,
      status: StoryStatus.DRAFT,
      isPublic: false,
      authorId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          storyId: 'story-1',
          order: 1,
          label: 'Start',
          storyText: 'Beginning',
          decisions: [],
          effects: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          storyId: 'story-1',
          order: 2,
          label: 'Middle',
          storyText: 'Continuation',
          decisions: [],
          effects: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-3',
          storyId: 'story-1',
          order: 3,
          label: 'End',
          storyText: 'Conclusion',
          decisions: [],
          effects: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      branches: [],
    };

    const timeline = backendToTimeline(story);

    expect(timeline.events).toHaveLength(3);
    expect(timeline.events[0].t).toBe(0);
    expect(timeline.events[1].t).toBe(0.5);
    expect(timeline.events[2].t).toBe(1);
    expect(timeline.events[0].title).toBe('Start');
    expect(timeline.branches).toHaveLength(0);
  });

  it('should transform branches correctly', () => {
    const story: Story = {
      id: 'story-1',
      title: 'Test Story',
      language: 'hu',
      version: 1,
      status: StoryStatus.DRAFT,
      isPublic: false,
      authorId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          storyId: 'story-1',
          order: 1,
          label: 'Start',
          storyText: '',
          decisions: [],
          effects: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      branches: [
        {
          id: 'branch-1',
          storyId: 'story-1',
          name: 'Side Quest',
          type: BranchType.LOCATION,
          entryNodeId: 'node-1',
          exitNodeIds: ['node-1'],
          exitType: ExitType.NODE,
          depth: 1,
          nodes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const timeline = backendToTimeline(story);

    expect(timeline.branches).toHaveLength(1);
    expect(timeline.branches[0].id).toBe('branch-1');
    expect(timeline.branches[0].title).toBe('Side Quest');
    expect(timeline.branches[0].terminal).toBe(false);
    expect(timeline.branches[0].depth).toBe(1);
  });

  it('should mark terminal branches correctly', () => {
    const story: Story = {
      id: 'story-1',
      title: 'Test Story',
      language: 'hu',
      version: 1,
      status: StoryStatus.DRAFT,
      isPublic: false,
      authorId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],
      branches: [
        {
          id: 'branch-1',
          storyId: 'story-1',
          name: 'Death Branch',
          type: BranchType.EVENT,
          entryNodeId: 'node-1',
          exitNodeIds: ['DEATH'],
          exitType: ExitType.DEATH,
          depth: 1,
          nodes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const timeline = backendToTimeline(story);

    expect(timeline.branches[0].terminal).toBe(true);
  });
});

// ============= TIMELINE → BACKEND TRANSFORMATION TESTS =============

describe('timelineToBackend', () => {
  it('should transform timeline events to backend nodes', () => {
    const timeline: TimelineData = {
      events: [
        { id: 'ev-1', t: 0, type: 'note', title: 'Start', description: 'Beginning' },
        { id: 'ev-2', t: 0.5, type: 'quiz', title: 'Middle', description: 'Test' },
        { id: 'ev-3', t: 1, type: 'note', title: 'End', description: 'Finish' },
      ],
      branches: [],
    };

    const result = timelineToBackend(timeline, { storyId: 'story-1' });

    expect(result.mainlineNodes).toHaveLength(3);
    expect(result.mainlineNodes[0].order).toBe(1);
    expect(result.mainlineNodes[1].order).toBe(2);
    expect(result.mainlineNodes[2].order).toBe(3);
    expect(result.mainlineNodes[0].label).toBe('Start');
    expect(result.branches).toHaveLength(0);
  });

  it('should transform branches to backend format', () => {
    const timeline: TimelineData = {
      events: [
        { id: 'ev-1', t: 0, type: 'note', title: 'Start', description: '' },
        { id: 'ev-2', t: 1, type: 'note', title: 'End', description: '' },
      ],
      branches: [
        {
          id: 'br-1',
          title: 'Side Quest',
          terminal: false,
          parent: { kind: 'main', t: 0.5 },
          points: [
            { x: 140, y: 100 },
            { x: 300, y: 200 },
            { x: 140, y: 400 },
          ],
          depth: 1,
          events: [
            { id: 'bev-1', nodeIndex: 1, type: 'note', title: 'Branch Event', description: '' },
          ],
        },
      ],
    };

    const result = timelineToBackend(timeline, { storyId: 'story-1' });

    expect(result.branches).toHaveLength(1);
    expect(result.branches[0].name).toBe('Side Quest');
    expect(result.branches[0].exitType).toBe(ExitType.NODE);
    expect(result.branchNodes).toHaveLength(1);
    expect(result.branchNodes[0].label).toBe('Branch Event');
  });

  it('should handle terminal branches', () => {
    const timeline: TimelineData = {
      events: [
        { id: 'ev-1', t: 0, type: 'note', title: 'Start', description: '' },
      ],
      branches: [
        {
          id: 'br-1',
          title: 'Death Path',
          terminal: true,
          parent: { kind: 'main', t: 0.5 },
          points: [
            { x: 140, y: 100 },
            { x: 300, y: 200 },
          ],
          depth: 1,
          events: [],
        },
      ],
    };

    const result = timelineToBackend(timeline, { storyId: 'story-1' });

    expect(result.branches[0].exitType).toBe(ExitType.DEATH);
    expect(result.branches[0].exitNodeIds).toEqual(['DEATH']);
  });

  it('should enforce max depth of 3', () => {
    const timeline: TimelineData = {
      events: [
        { id: 'ev-1', t: 0, type: 'note', title: 'Start', description: '' },
      ],
      branches: [
        {
          id: 'br-1',
          title: 'Deep Branch',
          terminal: false,
          parent: { kind: 'main', t: 0.5 },
          points: [{ x: 140, y: 100 }, { x: 300, y: 200 }],
          depth: 5, // Should be clamped to 3
          events: [],
        },
      ],
    };

    const result = timelineToBackend(timeline, { storyId: 'story-1' });

    expect(result.branches[0].depth).toBe(3); // Clamped to max
  });
});

// ============= ROUND-TRIP TRANSFORMATION TESTS =============

describe('Round-trip transformation', () => {
  it('should preserve data through backend → timeline → backend', () => {
    const originalStory: Story = {
      id: 'story-1',
      title: 'Test Story',
      language: 'hu',
      version: 1,
      status: StoryStatus.DRAFT,
      isPublic: false,
      authorId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          storyId: 'story-1',
          order: 1,
          label: 'Start',
          storyText: 'Beginning',
          decisions: [],
          effects: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          storyId: 'story-1',
          order: 2,
          label: 'End',
          storyText: 'Finish',
          decisions: [],
          effects: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      branches: [],
    };

    // Backend → Timeline
    const timeline = backendToTimeline(originalStory);

    // Timeline → Backend
    const backendData = timelineToBackend(timeline, { storyId: 'story-1' });

    // Verify structure preserved
    expect(backendData.mainlineNodes).toHaveLength(2);
    expect(backendData.mainlineNodes[0].label).toBe('Start');
    expect(backendData.mainlineNodes[1].label).toBe('End');
    expect(backendData.mainlineNodes[0].order).toBe(1);
    expect(backendData.mainlineNodes[1].order).toBe(2);
  });
});
