import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateStoryDto, UpdateStoryDto } from './dto';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateStoryDto) {
    return this.prisma.story.create({
      data: {
        ...dto,
        authorId: userId,
      },
    });
  }

  async findAll(userId?: string) {
    return this.prisma.story.findMany({
      where: userId ? { authorId: userId } : { isPublished: true },
      include: { author: { select: { id: true, username: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: { author: { select: { username: true } } },
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

    return this.prisma.story.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, userId: string) {
    const story = await this.findOne(id);
    if (story.authorId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.story.delete({ where: { id } });
  }
}
