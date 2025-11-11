import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PuzzlesService } from './puzzles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ValidatePuzzleDto } from './dto';

@Controller('puzzles')
@UseGuards(JwtAuthGuard)
export class PuzzlesController {
  constructor(private puzzlesService: PuzzlesService) {}

  @Post(':sessionId/validate')
  validate(@Param('sessionId') sessionId: string, @Body() dto: ValidatePuzzleDto) {
    return this.puzzlesService.validate(sessionId, dto);
  }
}
