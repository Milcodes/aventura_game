import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBranchDto) {
    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: dto.storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.authorId !== userId) {
      throw new ForbiddenException('Not authorized to add branches to this story');
    }

    // Verify entry node exists and belongs to story
    const entryNode = await this.prisma.storyNode.findUnique({
      where: { id: dto.entryNodeId },
    });

    if (!entryNode || entryNode.storyId !== dto.storyId) {
      throw new BadRequestException('Invalid entry node');
    }

    // Calculate depth
    let depth = 1;
    if (dto.parentBranchId) {
      const parentBranch = await this.prisma.branch.findUnique({
        where: { id: dto.parentBranchId },
      });

      if (!parentBranch || parentBranch.storyId !== dto.storyId) {
        throw new BadRequestException('Invalid parent branch');
      }

      depth = parentBranch.depth + 1;

      // Enforce max depth 3
      if (depth > 3) {
        throw new BadRequestException('Maximum branch nesting depth is 3 levels');
      }

      // Verify entry node belongs to parent branch
      if (entryNode.branchId !== dto.parentBranchId) {
        throw new BadRequestException('Entry node must belong to parent branch');
      }
    } else {
      // Top-level branch: entry node must be mainline node
      if (entryNode.branchId !== null) {
        throw new BadRequestException('Top-level branch entry node must be a mainline node');
      }
    }

    // Verify exit nodes exist (except "DEATH")
    for (const exitId of dto.exitNodeIds) {
      if (exitId !== 'DEATH') {
        const exitNode = await this.prisma.storyNode.findUnique({
          where: { id: exitId },
        });

        if (!exitNode || exitNode.storyId !== dto.storyId) {
          throw new BadRequestException(`Invalid exit node: ${exitId}`);
        }
      }
    }

    // Create branch
    return this.prisma.branch.create({
      data: {
        ...dto,
        depth,
        exitNodeIds: dto.exitNodeIds, // Prisma will handle JSON conversion
      },
    });
  }

  async findByStory(storyId: string) {
    return this.prisma.branch.findMany({
      where: { storyId },
      include: {
        nodes: {
          orderBy: { order: 'asc' },
        },
        childBranches: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        story: { select: { id: true, title: true } },
        nodes: {
          orderBy: { order: 'asc' },
        },
        parentBranch: { select: { id: true, name: true } },
        childBranches: { select: { id: true, name: true } },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, userId: string, dto: UpdateBranchDto) {
    const branch = await this.findOne(id);

    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: branch.storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // If updating entry node, verify it exists
    if (dto.entryNodeId) {
      const entryNode = await this.prisma.storyNode.findUnique({
        where: { id: dto.entryNodeId },
      });

      if (!entryNode || entryNode.storyId !== branch.storyId) {
        throw new BadRequestException('Invalid entry node');
      }

      // If branch has parent, verify entry node belongs to parent branch
      if (branch.parentBranchId && entryNode.branchId !== branch.parentBranchId) {
        throw new BadRequestException('Entry node must belong to parent branch');
      }

      // If top-level branch, verify entry node is mainline
      if (!branch.parentBranchId && entryNode.branchId !== null) {
        throw new BadRequestException('Top-level branch entry node must be a mainline node');
      }
    }

    // If updating exit nodes, verify they exist
    if (dto.exitNodeIds) {
      for (const exitId of dto.exitNodeIds) {
        if (exitId !== 'DEATH') {
          const exitNode = await this.prisma.storyNode.findUnique({
            where: { id: exitId },
          });

          if (!exitNode || exitNode.storyId !== branch.storyId) {
            throw new BadRequestException(`Invalid exit node: ${exitId}`);
          }
        }
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const branch = await this.findOne(id);

    // Verify user owns the story
    const story = await this.prisma.story.findUnique({
      where: { id: branch.storyId },
    });

    if (!story || story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Check if this branch has child branches
    if (branch.childBranches.length > 0) {
      throw new BadRequestException(
        'Cannot delete branch - it has nested child branches: ' +
        branch.childBranches.map(b => b.name).join(', ')
      );
    }

    // Delete will cascade to nodes due to onDelete: Cascade
    return this.prisma.branch.delete({ where: { id } });
  }

  async getBranchTree(storyId: string) {
    // Get all branches for the story
    const branches = await this.prisma.branch.findMany({
      where: { storyId },
      include: {
        nodes: {
          select: { id: true, label: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { depth: 'asc' },
    });

    // Build hierarchical tree structure
    const branchMap = new Map();
    const rootBranches = [];

    // First pass: create map
    branches.forEach(branch => {
      branchMap.set(branch.id, { ...branch, children: [] });
    });

    // Second pass: build tree
    branches.forEach(branch => {
      const branchNode = branchMap.get(branch.id);
      if (branch.parentBranchId) {
        const parent = branchMap.get(branch.parentBranchId);
        if (parent) {
          parent.children.push(branchNode);
        }
      } else {
        rootBranches.push(branchNode);
      }
    });

    return rootBranches;
  }
}
