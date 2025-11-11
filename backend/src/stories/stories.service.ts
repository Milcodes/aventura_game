import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateStoryDto, UpdateStoryDto, StoryStatus } from './dto';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoryDto) {
    return this.prisma.story.create({
      data: {
        ...dto,
        authorId: userId,
        status: StoryStatus.DRAFT, // All new stories start as DRAFT
      },
    });
  }

  async findAll(userId?: string, includeNodes = false) {
    const where = userId
      ? { authorId: userId }
      : { status: StoryStatus.PUBLISHED, isPublic: true };

    return this.prisma.story.findMany({
      where,
      include: {
        author: { select: { id: true, username: true } },
        nodes: includeNodes,
        branches: includeNodes,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, includeDetails = false) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        author: { select: { username: true } },
        nodes: includeDetails ? {
          orderBy: { order: 'asc' },
        } : false,
        branches: includeDetails ? {
          include: {
            nodes: {
              orderBy: { order: 'asc' },
            },
          },
        } : false,
      },
    });
    if (!story) {
      throw new NotFoundException('Story not found');
    }
    return story;
  }

  async update(id: string, userId: string, dto: UpdateStoryDto) {
    const story = await this.findOne(id);
    if (story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Handle version conflict (optimistic locking)
    if (dto.version !== undefined && dto.version !== story.version) {
      throw new BadRequestException('Version conflict - story was modified by another user');
    }

    // Increment version on update
    const newVersion = story.version + 1;

    return this.prisma.story.update({
      where: { id },
      data: {
        ...dto,
        version: newVersion,
      },
    });
  }

  async delete(id: string, userId: string) {
    const story = await this.findOne(id);
    if (story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.story.delete({ where: { id } });
  }

  async updateStatus(id: string, userId: string, status: StoryStatus) {
    const story = await this.findOne(id, true);

    // Only author can update status
    if (story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Validate story structure before publishing
    if (status === StoryStatus.PUBLISHED) {
      await this.validateStoryStructure(id);
    }

    return this.prisma.story.update({
      where: { id },
      data: {
        status,
        version: story.version + 1,
      },
    });
  }

  private async validateStoryStructure(storyId: string): Promise<void> {
    const story = await this.findOne(storyId, true);

    // Rule: Minimum 3 mainline nodes
    const mainlineNodes = story.nodes.filter(n => !n.branchId);
    if (mainlineNodes.length < 3) {
      throw new BadRequestException('Story must have at least 3 mainline nodes (Birth, Life events, Death)');
    }

    // Rule: All branches must have valid entry/exit points
    for (const branch of story.branches) {
      const entryNode = await this.prisma.storyNode.findUnique({
        where: { id: branch.entryNodeId },
      });

      if (!entryNode || entryNode.storyId !== storyId) {
        throw new BadRequestException(`Branch "${branch.name}" has invalid entry point`);
      }

      const exitNodeIds = Array.isArray(branch.exitNodeIds)
        ? branch.exitNodeIds
        : JSON.parse(branch.exitNodeIds as any);

      for (const exitId of exitNodeIds) {
        if (exitId !== 'DEATH') {
          const exitNode = await this.prisma.storyNode.findUnique({
            where: { id: exitId },
          });

          if (!exitNode || exitNode.storyId !== storyId) {
            throw new BadRequestException(`Branch "${branch.name}" has invalid exit point: ${exitId}`);
          }
        }
      }

      // Rule: Branch must have at least 1 node
      if (branch.nodes.length === 0) {
        throw new BadRequestException(`Branch "${branch.name}" must have at least one node`);
      }

      // Rule: Max 100 nodes per branch
      if (branch.nodes.length > 100) {
        throw new BadRequestException(`Branch "${branch.name}" exceeds maximum of 100 nodes`);
      }
    }

    // Rule: Max depth 3 for branches
    const maxDepth = Math.max(...story.branches.map(b => b.depth), 0);
    if (maxDepth > 3) {
      throw new BadRequestException('Branch nesting depth cannot exceed 3 levels');
    }
  }
}
