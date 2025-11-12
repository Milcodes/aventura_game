/**
 * E2E Tests for TimelineEditorIntegrated
 *
 * Tests the full integration flow:
 * 1. Load story from backend
 * 2. Transform to timeline format
 * 3. Edit in timeline editor
 * 4. Validate changes
 * 5. Save back to backend
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TimelineEditorIntegrated from './TimelineEditorIntegrated';
import * as storiesApi from '../api/stories';
import type { Story } from '../api/stories';

// Mock the stories API
vi.mock('../api/stories', () => ({
  storiesApi: {
    getOne: vi.fn(),
    createNode: vi.fn(),
    deleteNode: vi.fn(),
    createBranch: vi.fn(),
    deleteBranch: vi.fn(),
  },
}));

describe('TimelineEditorIntegrated E2E', () => {
  const mockStory: Story = {
    id: 'test-story-1',
    title: 'Test Story',
    description: 'A test story',
    language: 'hu',
    version: 1,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: 'node-1',
        storyId: 'test-story-1',
        label: 'Start',
        storyText: 'Story begins',
        order: 1,
        branchId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'node-2',
        storyId: 'test-story-1',
        label: 'Middle',
        storyText: 'Story continues',
        order: 2,
        branchId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'node-3',
        storyId: 'test-story-1',
        label: 'End',
        storyText: 'Story ends',
        order: 3,
        branchId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    branches: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful story load
    vi.mocked(storiesApi.storiesApi.getOne).mockResolvedValue({
      data: mockStory,
    } as any);
  });

  it('should load story and display timeline editor', async () => {
    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    // Should show loading state first
    expect(screen.getByText(/Történet betöltése/i)).toBeInTheDocument();

    // Wait for story to load
    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Should show stats
    const statsSection = screen.getByText(/Mainline Events:/i).closest('.timeline-stats');
    expect(statsSection).toBeInTheDocument();
    expect(statsSection).toHaveTextContent('3'); // 3 mainline nodes
  });

  it('should display validation status', async () => {
    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Should show validation status (✅ Valid after debounce)
    await waitFor(
      () => {
        expect(screen.getByText(/✅ Valid/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('should show validation errors for invalid timeline', async () => {
    // Mock story with only 1 node (less than minimum 3)
    const invalidStory: Story = {
      ...mockStory,
      nodes: [mockStory.nodes![0]],
    };

    vi.mocked(storiesApi.storiesApi.getOne).mockResolvedValue({
      data: invalidStory,
    } as any);

    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Wait for validation to run (debounced 500ms)
    await waitFor(
      () => {
        expect(screen.getByText(/❌/i)).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('should handle validation button click', async () => {
    const user = userEvent.setup();
    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Find and click validation button
    const validateButton = screen.getByText(/✓ Validálás/i);

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await user.click(validateButton);

    // Should show success alert
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ Validáció sikeres')
    );

    alertSpy.mockRestore();
  });

  it('should handle save flow with validation', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    // Mock delete and create API calls
    vi.mocked(storiesApi.storiesApi.deleteNode).mockResolvedValue({} as any);
    vi.mocked(storiesApi.storiesApi.deleteBranch).mockResolvedValue({} as any);
    vi.mocked(storiesApi.storiesApi.createNode).mockResolvedValue({
      data: { id: 'new-node-1' },
    } as any);
    vi.mocked(storiesApi.storiesApi.createBranch).mockResolvedValue({
      data: { id: 'new-branch-1' },
    } as any);

    render(
      <TimelineEditorIntegrated storyId="test-story-1" onSave={onSave} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Find and click save button
    const saveButton = screen.getByText(/💾 Mentés Backend-be/i);

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    await user.click(saveButton);

    // Wait for save to complete
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ Történet sikeresen mentve')
      );
    });

    // Should call onSave callback
    expect(onSave).toHaveBeenCalled();

    // Should delete old nodes
    expect(storiesApi.storiesApi.deleteNode).toHaveBeenCalledTimes(3);

    // Should create new nodes
    expect(storiesApi.storiesApi.createNode).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('should handle reload button', async () => {
    const user = userEvent.setup();
    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    // Clear mock calls
    vi.mocked(storiesApi.storiesApi.getOne).mockClear();

    // Find and click reload button
    const reloadButton = screen.getByTitle(/Újratöltés backend-ről/i);
    await user.click(reloadButton);

    // Should reload story
    expect(storiesApi.storiesApi.getOne).toHaveBeenCalledWith('test-story-1', true);
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    vi.mocked(storiesApi.storiesApi.getOne).mockRejectedValue({
      response: {
        data: {
          message: 'Story not found',
        },
      },
    });

    const onError = vi.fn();

    render(
      <TimelineEditorIntegrated storyId="test-story-1" onError={onError} />
    );

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/⚠️ Hiba történt/i)).toBeInTheDocument();
      expect(screen.getByText('Story not found')).toBeInTheDocument();
    });

    // Should call onError callback
    expect(onError).toHaveBeenCalledWith('Story not found');
  });

  it('should show saving state during save', async () => {
    const user = userEvent.setup();

    // Mock slow save operation
    vi.mocked(storiesApi.storiesApi.deleteNode).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/💾 Mentés Backend-be/i);

    // Mock window.alert to prevent blocking
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    await user.click(saveButton);

    // Should show saving state
    await waitFor(() => {
      expect(screen.getByText(/💾 Mentés.../i)).toBeInTheDocument();
    });
  });

  it('should disable buttons during save', async () => {
    const user = userEvent.setup();

    // Mock slow save
    vi.mocked(storiesApi.storiesApi.deleteNode).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<TimelineEditorIntegrated storyId="test-story-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/💾 Mentés Backend-be/i);
    const validateButton = screen.getByText(/✓ Validálás/i);
    const reloadButton = screen.getByTitle(/Újratöltés backend-ről/i);

    vi.spyOn(window, 'alert').mockImplementation(() => {});

    await user.click(saveButton);

    // Buttons should be disabled during save
    await waitFor(() => {
      expect(saveButton).toBeDisabled();
      expect(validateButton).toBeDisabled();
      expect(reloadButton).toBeDisabled();
    });
  });
});
