import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShopTransactionDto } from './dto';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private shopService: ShopService) {}

  @Post(':sessionId/transaction')
  transaction(@Param('sessionId') sessionId: string, @Body() dto: ShopTransactionDto) {
    return this.shopService.transaction(sessionId, dto);
  }
}
