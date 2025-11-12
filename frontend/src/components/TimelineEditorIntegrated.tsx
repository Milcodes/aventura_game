/**
 * TimelineEditorIntegrated - Wrapper component that connects Timeline Editor to Backend
 *
 * This component:
 * 1. Loads story data from backend
 * 2. Transforms backend → timeline format (using adapter)
 * 3. Provides TimelineEditor with data
 * 4. Handles save: timeline → backend transformation
 * 5. Manages validation and error states
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { storiesApi, Story } from '../api/stories';
import {
  backendToTimeline,
  timelineToBackend,
  validateTimelineForBackend,
} from '../adapters/timelineAdapter';
import { TimelineData } from '../adapters/timelineAdapter.types';
import TimelineEditor from './TimelineEditor';
import './TimelineEditorIntegrated.css';

interface TimelineEditorIntegratedProps {
  storyId: string;
  onSave?: () => void;
  onError?: (error: string) => void;
}

function TimelineEditorIntegrated({
  storyId,
  onSave,
  onError,
}: TimelineEditorIntegratedProps) {
  // State
  const [story, setStory] = useState<Story | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Ref for debounce timeout
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load story from backend
  useEffect(() => {
    loadStory();
  }, [storyId]);

  const loadStory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch story with all nodes and branches
      const response = await storiesApi.getOne(storyId, true);
      const storyData = response.data;

      setStory(storyData);

      // Transform backend → timeline
      const timeline = backendToTimeline(storyData);
      setTimelineData(timeline);
    } catch (err: any) {
      console.error('Failed to load story:', err);
      const errorMsg = err.response?.data?.message || 'Failed to load story';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle timeline data changes
  const handleTimelineChange = useCallback((newData: TimelineData) => {
    setTimelineData(newData);

    // Clear previous validation errors when data changes
    setValidationErrors([]);
  }, []);

  // Real-time validation with debounce (500ms)
  useEffect(() => {
    if (!timelineData) return;

    // Clear previous timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Set validating state
    setIsValidating(true);

    // Debounce validation
    validationTimeoutRef.current = setTimeout(() => {
      const validation = validateTimelineForBackend(timelineData, {
        storyId,
        maxDepth: 3,
        maxNodesPerBranch: 100,
        minMainlineNodes: 3,
      });

      const errorMessages = validation.errors
        .filter((e) => e.type === 'error')
        .map((e) => e.message);

      setValidationErrors(errorMessages);
      setIsValidating(false);
    }, 500);

    // Cleanup on unmount
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [timelineData, storyId]);

  // Validate timeline data
  const handleValidate = useCallback(() => {
    if (!timelineData) return;

    const validation = validateTimelineForBackend(timelineData, {
      storyId,
      maxDepth: 3,
      maxNodesPerBranch: 100,
      minMainlineNodes: 3,
    });

    const errorMessages = validation.errors
      .filter((e) => e.type === 'error')
      .map((e) => e.message);

    setValidationErrors(errorMessages);

    if (validation.valid) {
      alert('✅ Validáció sikeres! A történet menthető.');
    } else {
      alert(`⚠️ Validációs hibák:\n\n${errorMessages.join('\n')}`);
    }

    return validation.valid;
  }, [timelineData, storyId]);

  // Save timeline to backend
  const handleSave = async () => {
    if (!timelineData || !story) return;

    // Validate first
    const validation = validateTimelineForBackend(timelineData, {
      storyId,
      maxDepth: 3,
      maxNodesPerBranch: 100,
      minMainlineNodes: 3,
    });

    if (!validation.valid) {
      const errorMessages = validation.errors
        .filter((e) => e.type === 'error')
        .map((e) => e.message);

      setValidationErrors(errorMessages);
      alert(`⚠️ Nem lehet menteni! Validációs hibák:\n\n${errorMessages.join('\n')}`);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setValidationErrors([]);

      // Transform timeline → backend
      const backendData = timelineToBackend(timelineData, { storyId });

      // Save using transaction-based approach:
      // 1. Delete all existing nodes and branches
      // 2. Create new structure

      // Delete existing nodes (cascade will handle branches)
      const existingNodes = story.nodes || [];
      for (const node of existingNodes) {
        await storiesApi.deleteNode(node.id);
      }

      // Delete existing branches
      const existingBranches = story.branches || [];
      for (const branch of existingBranches) {
        await storiesApi.deleteBranch(branch.id);
      }

      // Create mainline nodes
      const createdMainlineNodes: { [key: string]: string } = {}; // temp ID → backend ID
      for (let i = 0; i < backendData.mainlineNodes.length; i++) {
        const nodeDto = backendData.mainlineNodes[i];
        const response = await storiesApi.createNode(nodeDto);
        createdMainlineNodes[`mainline-${i}`] = response.data.id;
      }

      // Create branches with updated entry/exit node IDs
      const createdBranches: { [key: string]: string } = {}; // temp ID → backend ID
      for (let i = 0; i < backendData.branches.length; i++) {
        const branchDto = backendData.branches[i];

        // Resolve entryNodeId (use created mainline node IDs)
        const entryNodeId = Object.values(createdMainlineNodes)[0]; // Default to first node
        const exitNodeIds = branchDto.exitNodeIds.includes('DEATH')
          ? ['DEATH']
          : [Object.values(createdMainlineNodes)[Object.values(createdMainlineNodes).length - 1]]; // Default to last node

        const response = await storiesApi.createBranch({
          ...branchDto,
          entryNodeId,
          exitNodeIds,
        });
        createdBranches[`branch-${i}`] = response.data.id;
      }

      // Create branch nodes
      for (const nodeDto of backendData.branchNodes) {
        await storiesApi.createNode(nodeDto);
      }

      // Success!
      alert('✅ Történet sikeresen mentve!');
      onSave?.();

      // Reload story to get latest data
      await loadStory();
    } catch (err: any) {
      console.error('Failed to save timeline:', err);
      const errorMsg = err.response?.data?.message || 'Failed to save timeline';
      setError(errorMsg);
      onError?.(errorMsg);
      alert(`❌ Mentés sikertelen:\n\n${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="timeline-integrated-loading">
        <div className="spinner"></div>
        <p>Történet betöltése...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="timeline-integrated-error">
        <h2>⚠️ Hiba történt</h2>
        <p>{error}</p>
        <button onClick={loadStory}>🔄 Újra próbálom</button>
      </div>
    );
  }

  // Render timeline editor
  if (!timelineData) {
    return (
      <div className="timeline-integrated-error">
        <h2>⚠️ Nincs adat</h2>
        <p>A történet nem tartalmaz adatokat.</p>
      </div>
    );
  }

  return (
    <div className="timeline-integrated">
      {/* Toolbar */}
      <div className="timeline-toolbar">
        <div className="timeline-info">
          <h2>{story?.title}</h2>
          <span className="version-badge">v{story?.version}</span>
        </div>

        <div className="timeline-actions">
          <button
            className="btn-validate"
            onClick={handleValidate}
            disabled={saving}
          >
            ✓ Validálás
          </button>

          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '💾 Mentés...' : '💾 Mentés Backend-be'}
          </button>

          <button
            className="btn-reload"
            onClick={loadStory}
            disabled={saving}
            title="Újratöltés backend-ről"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="validation-errors">
          <h3>⚠️ Validációs hibák:</h3>
          <ul>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="timeline-stats">
        <div className="stat">
          <span className="stat-label">Mainline Events:</span>
          <span className="stat-value">{timelineData.events.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Branches:</span>
          <span className="stat-value">{timelineData.branches.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total Nodes:</span>
          <span className="stat-value">
            {timelineData.events.length +
              timelineData.branches.reduce((sum, b) => sum + b.events.length, 0)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Validation:</span>
          <span className={`stat-value ${validationErrors.length > 0 ? 'error' : 'success'}`}>
            {isValidating ? '⏳ Validating...' : validationErrors.length > 0 ? `❌ ${validationErrors.length} errors` : '✅ Valid'}
          </span>
        </div>
      </div>

      {/* Timeline Editor */}
      <div className="timeline-editor-wrapper">
        <TimelineEditor
          initialData={timelineData}
          onChange={handleTimelineChange}
        />
      </div>

      {/* Help text */}
      <div className="timeline-help">
        <p>
          💡 <strong>Tipp:</strong> Használd a <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> gombokat
          az visszavonáshoz/újra végrehajtáshoz.
        </p>
        <p>
          🎨 Drag-and-drop a node-ok mozgatásához. Klikk a mainline-ra új event hozzáadásához.
        </p>
      </div>
    </div>
  );
}

// Export memoized component for performance optimization
export default React.memo(TimelineEditorIntegrated);
