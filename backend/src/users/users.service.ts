import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: { email: string; username: string; password: string }) {
    try {
      return await this.prisma.user.create({
        data,
        select: { id: true, email: true, username: true, createdAt: true },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email or username already exists');
      }
      throw error;
    }
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, username: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
