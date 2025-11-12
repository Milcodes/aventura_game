/**
 * Integration tests for Timeline Adapter
 *
 * Tests the full roundtrip transformation:
 * Backend → Timeline → Backend
 */

import { describe, it, expect } from 'vitest';
import {
  backendToTimeline,
  timelineToBackend,
  validateTimelineForBackend,
} from './timelineAdapter';
import type { Story } from './timelineAdapter.types';

describe('Timeline Adapter Integration', () => {
  it('should handle full roundtrip: Backend → Timeline → Backend', () => {
    // Mock backend story
    const backendStory: Story = {
      id: 'story-1',
      title: 'Integration Test Story',
      description: 'Testing roundtrip',
      language: 'hu',
      version: 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          storyId: 'story-1',
          label: 'Start',
          storyText: 'Beginning',
          order: 1,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          storyId: 'story-1',
          label: 'Middle',
          storyText: 'Middle part',
          order: 2,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-3',
          storyId: 'story-1',
          label: 'End',
          storyText: 'Ending',
          order: 3,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      branches: [],
    };

    // Step 1: Backend → Timeline
    const timeline = backendToTimeline(backendStory);

    // Verify timeline structure
    expect(timeline.events).toHaveLength(3);
    expect(timeline.events[0].t).toBe(0); // First event at t=0
    expect(timeline.events[1].t).toBe(0.5); // Middle event at t=0.5
    expect(timeline.events[2].t).toBe(1); // Last event at t=1
    expect(timeline.branches).toHaveLength(0);

    // Step 2: Validate timeline
    const validation = validateTimelineForBackend(timeline, {
      storyId: 'story-1',
      maxDepth: 3,
      maxNodesPerBranch: 100,
      minMainlineNodes: 3,
    });

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Step 3: Timeline → Backend
    const backendResult = timelineToBackend(timeline, { storyId: 'story-1' });

    // Verify backend structure
    expect(backendResult.mainlineNodes).toHaveLength(3);
    expect(backendResult.mainlineNodes[0].order).toBe(1);
    expect(backendResult.mainlineNodes[1].order).toBe(2);
    expect(backendResult.mainlineNodes[2].order).toBe(3);
    expect(backendResult.branchNodes).toHaveLength(0);
    expect(backendResult.branches).toHaveLength(0);
  });

  it('should preserve data through roundtrip with branches', () => {
    const backendStory: Story = {
      id: 'story-2',
      title: 'Story with Branches',
      description: 'Testing branches',
      language: 'hu',
      version: 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          storyId: 'story-2',
          label: 'Start',
          storyText: 'Beginning',
          order: 1,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          storyId: 'story-2',
          label: 'Choice',
          storyText: 'Make a choice',
          order: 2,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-3',
          storyId: 'story-2',
          label: 'End',
          storyText: 'Ending',
          order: 3,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'branch-node-1',
          storyId: 'story-2',
          label: 'Branch Start',
          storyText: 'Branch path',
          order: 1,
          branchId: 'branch-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'branch-node-2',
          storyId: 'story-2',
          label: 'Branch End',
          storyText: 'Branch ending',
          order: 2,
          branchId: 'branch-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      branches: [
        {
          id: 'branch-1',
          storyId: 'story-2',
          name: 'Alternative Path',
          type: 'SIDE_QUEST',
          entryNodeId: 'node-2',
          exitNodeIds: ['node-3'],
          exitType: 'CONTINUE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Backend → Timeline
    const timeline = backendToTimeline(backendStory);

    expect(timeline.events).toHaveLength(3); // Mainline events
    expect(timeline.branches).toHaveLength(1); // One branch

    const branch = timeline.branches[0];
    expect(branch.events).toHaveLength(2); // Branch has 2 events
    expect(branch.terminal).toBe(false); // Not terminal (exits to node-3)

    // Validate
    const validation = validateTimelineForBackend(timeline, {
      storyId: 'story-2',
      maxDepth: 3,
      maxNodesPerBranch: 100,
      minMainlineNodes: 3,
    });

    expect(validation.valid).toBe(true);

    // Timeline → Backend
    const backendResult = timelineToBackend(timeline, { storyId: 'story-2' });

    expect(backendResult.mainlineNodes).toHaveLength(3);
    expect(backendResult.branches).toHaveLength(1);
    expect(backendResult.branchNodes).toHaveLength(2);
  });

  it('should handle terminal branches correctly', () => {
    const backendStory: Story = {
      id: 'story-3',
      title: 'Story with Death',
      description: 'Testing terminal branches',
      language: 'hu',
      version: 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [
        {
          id: 'node-1',
          storyId: 'story-3',
          label: 'Start',
          storyText: 'Beginning',
          order: 1,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-2',
          storyId: 'story-3',
          label: 'Danger',
          storyText: 'Dangerous choice',
          order: 2,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'node-3',
          storyId: 'story-3',
          label: 'End',
          storyText: 'Ending',
          order: 3,
          branchId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'death-node',
          storyId: 'story-3',
          label: 'You died',
          storyText: 'Game over',
          order: 1,
          branchId: 'death-branch',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      branches: [
        {
          id: 'death-branch',
          storyId: 'story-3',
          name: 'Death Path',
          type: 'DEATH',
          entryNodeId: 'node-2',
          exitNodeIds: ['DEATH'],
          exitType: 'DEATH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Backend → Timeline
    const timeline = backendToTimeline(backendStory);

    const deathBranch = timeline.branches[0];
    expect(deathBranch.terminal).toBe(true); // Should be terminal

    // Timeline → Backend
    const backendResult = timelineToBackend(timeline, { storyId: 'story-3' });

    const resultBranch = backendResult.branches[0];
    expect(resultBranch.exitNodeIds).toContain('DEATH');
    expect(resultBranch.exitType).toBe('DEATH');
  });

  it('should validate minimum mainline nodes', () => {
    const timeline = {
      events: [
        { id: '1', t: 0, type: 'note' as const, title: 'A', description: '' },
        { id: '2', t: 1, type: 'note' as const, title: 'B', description: '' },
      ],
      branches: [],
    };

    const validation = validateTimelineForBackend(timeline, {
      storyId: 'test',
      minMainlineNodes: 3,
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0].message).toContain('Minimum 3');
  });

  it('should validate maximum depth', () => {
    const timeline = {
      events: [
        { id: '1', t: 0, type: 'note' as const, title: 'A', description: '' },
        { id: '2', t: 0.5, type: 'note' as const, title: 'B', description: '' },
        { id: '3', t: 1, type: 'note' as const, title: 'C', description: '' },
      ],
      branches: [
        {
          id: 'b1',
          title: 'Branch',
          terminal: false,
          parent: { kind: 'main' as const, t: 0.5 },
          points: [{ x: 200, y: 100 }],
          depth: 5, // Exceeds max depth of 3
          events: [
            {
              id: 'be1',
              nodeIndex: 0,
              type: 'note' as const,
              title: 'Branch Event',
              description: '',
            },
          ],
        },
      ],
    };

    const validation = validateTimelineForBackend(timeline, {
      storyId: 'test',
      maxDepth: 3,
      minMainlineNodes: 3,
    });

    expect(validation.valid).toBe(false);
    const depthError = validation.errors.find((e) =>
      e.message.toLowerCase().includes('depth')
    );
    expect(depthError).toBeDefined();
  });

  it('should validate maximum nodes per branch', () => {
    const events = Array.from({ length: 101 }, (_, i) => ({
      id: `be${i}`,
      nodeIndex: i,
      type: 'note' as const,
      title: `Event ${i}`,
      description: '',
    }));

    const timeline = {
      events: [
        { id: '1', t: 0, type: 'note' as const, title: 'A', description: '' },
        { id: '2', t: 0.5, type: 'note' as const, title: 'B', description: '' },
        { id: '3', t: 1, type: 'note' as const, title: 'C', description: '' },
      ],
      branches: [
        {
          id: 'b1',
          title: 'Long Branch',
          terminal: false,
          parent: { kind: 'main' as const, t: 0.5 },
          points: [{ x: 200, y: 100 }],
          depth: 1,
          events,
        },
      ],
    };

    const validation = validateTimelineForBackend(timeline, {
      storyId: 'test',
      maxNodesPerBranch: 100,
      minMainlineNodes: 3,
    });

    expect(validation.valid).toBe(false);
    const nodesError = validation.errors.find((e) =>
      e.message.includes('maximum')
    );
    expect(nodesError).toBeDefined();
  });
});
