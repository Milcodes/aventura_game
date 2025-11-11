import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateStoryNodeDto, UpdateStoryNodeDto, ReorderNodesDto } from './dto';

@Injectable()
export class StoryNodesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoryNodeDto) {
    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: dto.storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.authorId !== userId) {
      throw new ForbiddenException('Not authorized to add nodes to this story');
    }

    // If branchId provided, verify branch exists and belongs to story
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });

      if (!branch || branch.storyId !== dto.storyId) {
        throw new BadRequestException('Invalid branch');
      }

      // Check max 100 nodes per branch
      const branchNodeCount = await this.prisma.storyNode.count({
        where: { branchId: dto.branchId },
      });

      if (branchNodeCount >= 100) {
        throw new BadRequestException('Branch has reached maximum of 100 nodes');
      }
    }

    // Create node with default empty arrays for decisions and effects
    return this.prisma.storyNode.create({
      data: {
        ...dto,
        decisions: dto.decisions || [],
        effects: dto.effects || [],
      },
    });
  }

  async findByStory(storyId: string, branchId?: string) {
    return this.prisma.storyNode.findMany({
      where: {
        storyId,
        branchId: branchId || null, // null = mainline nodes
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const node = await this.prisma.storyNode.findUnique({
      where: { id },
      include: {
        story: { select: { id: true, title: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!node) {
      throw new NotFoundException('Story node not found');
    }

    return node;
  }

  async update(id: string, userId: string, dto: UpdateStoryNodeDto) {
    const node = await this.findOne(id);

    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: node.storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.storyNode.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const node = await this.findOne(id);

    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: node.storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Check if this node is referenced as entry/exit point in any branch
    const referencedInBranches = await this.prisma.branch.findMany({
      where: {
        storyId: node.storyId,
        OR: [
          { entryNodeId: id },
          // Note: exitNodeIds is JSON, need to handle this differently
        ],
      },
    });

    if (referencedInBranches.length > 0) {
      throw new BadRequestException(
        'Cannot delete node - it is used as entry/exit point for branches: ' +
        referencedInBranches.map(b => b.name).join(', ')
      );
    }

    return this.prisma.storyNode.delete({ where: { id } });
  }

  async reorderNodes(userId: string, storyId: string, dto: ReorderNodesDto) {
    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Update each node's order in a transaction
    await this.prisma.$transaction(
      dto.nodeOrders.map(({ nodeId, order }) =>
        this.prisma.storyNode.update({
          where: { id: nodeId },
          data: { order },
        })
      )
    );

    return { success: true };
  }

  async addDecision(nodeId: string, userId: string, decision: any) {
    const node = await this.findOne(nodeId);

    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: node.storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const decisions = Array.isArray(node.decisions)
      ? node.decisions
      : JSON.parse((node.decisions as any) || '[]');

    decisions.push(decision);

    return this.prisma.storyNode.update({
      where: { id: nodeId },
      data: { decisions },
    });
  }

  async addEffect(nodeId: string, userId: string, effect: any) {
    const node = await this.findOne(nodeId);

    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: node.storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const effects = Array.isArray(node.effects)
      ? node.effects
      : JSON.parse((node.effects as any) || '[]');

    effects.push(effect);

    return this.prisma.storyNode.update({
      where: { id: nodeId },
      data: { effects },
    });
  }
}
