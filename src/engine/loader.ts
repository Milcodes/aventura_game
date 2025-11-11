/**
 * Story Loader
 * Load and validate story JSON
 */

import { Story } from '../core/types';
import * as fs from 'fs';

/**
 * Load story from JSON file (Node.js)
 */
export async function loadStoryFromFile(filePath: string): Promise<Story> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return loadStoryFromJSON(content);
  } catch (err) {
    throw new Error(`Failed to load story from file: ${err}`);
  }
}

/**
 * Load story from JSON file synchronously (Node.js)
 */
export function loadStoryFromFileSync(filePath: string): Story {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return loadStoryFromJSON(content);
  } catch (err) {
    throw new Error(`Failed to load story from file: ${err}`);
  }
}

/**
 * Load story from JSON string
 */
export function loadStoryFromJSON(json: string): Story {
  try {
    const story = JSON.parse(json) as Story;
    validateStory(story);
    return story;
  } catch (err) {
    throw new Error(`Failed to parse story JSON: ${err}`);
  }
}

/**
 * Load story from URL (browser/fetch)
 */
export async function loadStoryFromURL(url: string): Promise<Story> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.text();
    return loadStoryFromJSON(json);
  } catch (err) {
    throw new Error(`Failed to load story from URL: ${err}`);
  }
}

/**
 * Validate story structure
 */
export function validateStory(story: Story): void {
  const errors: string[] = [];

  // Required fields
  if (!story.title) {
    errors.push('Missing required field: title');
  }
  if (!story.language) {
    errors.push('Missing required field: language');
  }
  if (!story.version) {
    errors.push('Missing required field: version');
  }
  if (!story.nodes || story.nodes.length === 0) {
    errors.push('Story must have at least one node');
  }

  // Validate nodes
  if (story.nodes) {
    const nodeIds = new Set<string>();
    const referencedNodeIds = new Set<string>();

    for (const node of story.nodes) {
      // Check for duplicate node IDs
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      // Validate choices
      if (node.choices) {
        for (const choice of node.choices) {
          referencedNodeIds.add(choice.next_id);

          // Check for self-reference without puzzle/effects
          if (choice.next_id === node.id && !node.puzzle && !choice.effects) {
            errors.push(`Node ${node.id} has infinite loop choice without puzzle or effects`);
          }
        }
      }

      // Validate puzzle
      if (node.puzzle) {
        if (node.puzzle.success?.next_id) {
          referencedNodeIds.add(node.puzzle.success.next_id);
        }
        if (node.puzzle.failure?.next_id) {
          referencedNodeIds.add(node.puzzle.failure.next_id);
        }
      }

      // Ending nodes should not have choices
      if (node.type === 'ending' && node.choices && node.choices.length > 0) {
        errors.push(`Ending node ${node.id} should not have choices`);
      }
    }

    // Check for unreachable nodes (warning, not error)
    for (const nodeId of nodeIds) {
      if (nodeId !== story.nodes[0].id && !referencedNodeIds.has(nodeId)) {
        console.warn(`Warning: Node ${nodeId} is not referenced by any choice`);
      }
    }

    // Check for invalid node references
    for (const refId of referencedNodeIds) {
      if (!nodeIds.has(refId)) {
        errors.push(`Referenced node not found: ${refId}`);
      }
    }
  }

  // Validate asset references
  if (story.nodes && story.assets) {
    const assetIds = new Set(story.assets.map((a) => a.id));

    for (const node of story.nodes) {
      if (node.media) {
        for (const mediaRef of node.media) {
          if (!assetIds.has(mediaRef.asset_id)) {
            errors.push(`Node ${node.id} references undefined asset: ${mediaRef.asset_id}`);
          }
        }
      }

      if (node.puzzle?.media) {
        for (const mediaRef of node.puzzle.media) {
          if (!assetIds.has(mediaRef.asset_id)) {
            errors.push(`Puzzle ${node.puzzle.id} references undefined asset: ${mediaRef.asset_id}`);
          }
        }
      }
    }
  }

  // Validate item references
  if (story.nodes && story.items) {
    const itemIds = new Set(story.items.map((i) => i.id));

    for (const node of story.nodes) {
      // Check on_enter effects
      if (node.on_enter?.effects) {
        for (const effect of node.on_enter.effects) {
          if ((effect.op === 'add_item' || effect.op === 'remove_item') && effect.item_id) {
            if (!itemIds.has(effect.item_id)) {
              errors.push(`Node ${node.id} references undefined item: ${effect.item_id}`);
            }
          }
        }
      }

      // Check choice effects and requirements
      if (node.choices) {
        for (const choice of node.choices) {
          if (choice.effects) {
            for (const effect of choice.effects) {
              if ((effect.op === 'add_item' || effect.op === 'remove_item') && effect.item_id) {
                if (!itemIds.has(effect.item_id)) {
                  errors.push(`Choice in node ${node.id} references undefined item: ${effect.item_id}`);
                }
              }
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Story validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get story metadata
 */
export interface StoryMetadata {
  title: string;
  language: string;
  version: string;
  nodeCount: number;
  assetCount: number;
  itemCount: number;
  currencyCount: number;
  statCount: number;
  puzzleCount: number;
  endingCount: number;
}

export function getStoryMetadata(story: Story): StoryMetadata {
  const puzzleCount = story.nodes.filter((n) => n.puzzle).length;
  const endingCount = story.nodes.filter((n) => n.type === 'ending').length;

  return {
    title: story.title,
    language: story.language,
    version: story.version,
    nodeCount: story.nodes.length,
    assetCount: story.assets?.length || 0,
    itemCount: story.items?.length || 0,
    currencyCount: story.currencies?.length || 0,
    statCount: story.stats?.length || 0,
    puzzleCount,
    endingCount,
  };
}
