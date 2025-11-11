import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSessionDto, UpdateStateDto } from './dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateSessionDto) {
    return this.prisma.gameSession.create({
      data: {
        userId,
        storyId: dto.storyId,
        state: dto.initialState || {},
      },
      include: { story: { select: { title: true, content: true } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.gameSession.findMany({
      where: { userId },
      include: { story: { select: { id: true, title: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const session = await this.prisma.gameSession.findFirst({
      where: { id, userId },
      include: { story: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async updateState(id: string, userId: string, dto: UpdateStateDto) {
    await this.findOne(id, userId); // Check ownership
    return this.prisma.gameSession.update({
      where: { id },
      data: { state: dto.state },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId); // Check ownership
    return this.prisma.gameSession.delete({ where: { id } });
  }
}
