import axios from 'axios';

export enum StoryStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum BranchType {
  LOCATION = 'LOCATION',
  ROOM = 'ROOM',
  EVENT = 'EVENT',
}

export enum ExitType {
  NODE = 'NODE',
  DEATH = 'DEATH',
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  language: string;
  version: number;
  status: StoryStatus;
  isPublic: boolean;
  content?: any;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
  };
  nodes?: StoryNode[];
  branches?: Branch[];
}

export interface StoryNode {
  id: string;
  storyId: string;
  branchId?: string;
  order: number;
  label: string;
  mediaType?: string;
  mediaUrl?: string;
  storyText?: string;
  decisions: any[];
  effects: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  storyId: string;
  name: string;
  type: BranchType;
  entryNodeId: string;
  exitNodeIds: string[];
  exitType: ExitType;
  parentBranchId?: string;
  depth: number;
  createdAt: string;
  updatedAt: string;
  nodes?: StoryNode[];
  parentBranch?: { id: string; name: string };
  childBranches?: { id: string; name: string }[];
}

export interface CreateStoryDto {
  title: string;
  description?: string;
  language?: string;
  content?: any;
  isPublic?: boolean;
}

export interface UpdateStoryDto {
  title?: string;
  description?: string;
  content?: any;
  status?: StoryStatus;
  isPublic?: boolean;
  version?: number;
}

export interface CreateStoryNodeDto {
  storyId: string;
  branchId?: string;
  order: number;
  label: string;
  mediaType?: string;
  mediaUrl?: string;
  storyText?: string;
  decisions?: any[];
  effects?: any[];
}

export interface UpdateStoryNodeDto {
  order?: number;
  label?: string;
  mediaType?: string;
  mediaUrl?: string;
  storyText?: string;
  decisions?: any[];
  effects?: any[];
}

export interface CreateBranchDto {
  storyId: string;
  name: string;
  type: BranchType;
  entryNodeId: string;
  exitNodeIds: string[];
  exitType?: ExitType;
  parentBranchId?: string;
}

export interface UpdateBranchDto {
  name?: string;
  type?: BranchType;
  entryNodeId?: string;
  exitNodeIds?: string[];
  exitType?: ExitType;
}

// Story API
export const storiesApi = {
  // Stories
  getAll: (userId?: string, includeNodes = false) =>
    axios.get<Story[]>('/api/stories', {
      params: { userId, includeNodes },
    }),

  getOne: (id: string, includeDetails = false) =>
    axios.get<Story>(`/api/stories/${id}`, {
      params: { includeDetails },
    }),

  create: (dto: CreateStoryDto) =>
    axios.post<Story>('/api/stories', dto),

  update: (id: string, dto: UpdateStoryDto) =>
    axios.put<Story>(`/api/stories/${id}`, dto),

  updateStatus: (id: string, status: StoryStatus) =>
    axios.put<Story>(`/api/stories/${id}/status`, { status }),

  delete: (id: string) =>
    axios.delete(`/api/stories/${id}`),

  // Story Nodes
  createNode: (dto: CreateStoryNodeDto) =>
    axios.post<StoryNode>('/api/stories/nodes', dto),

  getNodes: (storyId: string, branchId?: string) =>
    axios.get<StoryNode[]>(`/api/stories/${storyId}/nodes`, {
      params: { branchId },
    }),

  getNode: (nodeId: string) =>
    axios.get<StoryNode>(`/api/stories/nodes/${nodeId}`),

  updateNode: (nodeId: string, dto: UpdateStoryNodeDto) =>
    axios.put<StoryNode>(`/api/stories/nodes/${nodeId}`, dto),

  deleteNode: (nodeId: string) =>
    axios.delete(`/api/stories/nodes/${nodeId}`),

  reorderNodes: (storyId: string, nodeOrders: Array<{ nodeId: string; order: number }>) =>
    axios.put(`/api/stories/${storyId}/nodes/reorder`, { nodeOrders }),

  addDecision: (nodeId: string, decision: any) =>
    axios.post(`/api/stories/nodes/${nodeId}/decisions`, decision),

  addEffect: (nodeId: string, effect: any) =>
    axios.post(`/api/stories/nodes/${nodeId}/effects`, effect),

  // Branches
  createBranch: (dto: CreateBranchDto) =>
    axios.post<Branch>('/api/stories/branches', dto),

  getBranches: (storyId: string) =>
    axios.get<Branch[]>(`/api/stories/${storyId}/branches`),

  getBranchTree: (storyId: string) =>
    axios.get<any[]>(`/api/stories/${storyId}/branches/tree`),

  getBranch: (branchId: string) =>
    axios.get<Branch>(`/api/stories/branches/${branchId}`),

  updateBranch: (branchId: string, dto: UpdateBranchDto) =>
    axios.put<Branch>(`/api/stories/branches/${branchId}`, dto),

  deleteBranch: (branchId: string) =>
    axios.delete(`/api/stories/branches/${branchId}`),
};
