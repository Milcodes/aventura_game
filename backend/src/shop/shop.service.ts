import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ShopTransactionDto } from './dto';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  async transaction(sessionId: string, dto: ShopTransactionDto) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const state = session.state as any;

    // Check if user has enough currency
    const currentBalance = state.currencies[dto.cost.currency_id] || 0;

    if (dto.action === 'buy' && currentBalance < dto.cost.value) {
      // Log failed transaction
      await this.prisma.shopTransaction.create({
        data: {
          sessionId,
          action: dto.action,
          itemId: dto.itemId,
          quantity: dto.quantity,
          cost: dto.cost as any,
          success: false,
        },
      });

      throw new BadRequestException({
        error: 'INSUFFICIENT_FUNDS',
        message: `Not enough ${dto.cost.currency_id}. Required: ${dto.cost.value}, Available: ${currentBalance}`,
        required: dto.cost,
        available: { currency_id: dto.cost.currency_id, value: currentBalance },
      });
    }

    // Update state
    if (dto.action === 'buy') {
      state.currencies[dto.cost.currency_id] = currentBalance - dto.cost.value;
      state.inventory[dto.itemId] = (state.inventory[dto.itemId] || 0) + dto.quantity;
    } else {
      // Sell
      state.currencies[dto.cost.currency_id] = currentBalance + dto.cost.value;
      state.inventory[dto.itemId] = Math.max(0, (state.inventory[dto.itemId] || 0) - dto.quantity);
    }

    // Save updated state
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { state },
    });

    // Log successful transaction
    await this.prisma.shopTransaction.create({
      data: {
        sessionId,
        action: dto.action,
        itemId: dto.itemId,
        quantity: dto.quantity,
        cost: dto.cost as any,
        success: true,
      },
    });

    return {
      success: true,
      newBalance: state.currencies,
      newInventory: state.inventory,
    };
  }
}
