import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ValidatePuzzleDto } from './dto';
import { evaluatePuzzle } from '../../../src/engine/puzzles';

@Injectable()
export class PuzzlesService {
  constructor(private prisma: PrismaService) {}

  async validate(sessionId: string, dto: ValidatePuzzleDto) {
    // Get session and story
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { story: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Find puzzle in story
    const story = session.story.content as any;
    const node = story.nodes.find((n: any) => n.puzzle?.id === dto.puzzleId);

    if (!node || !node.puzzle) {
      throw new Error('Puzzle not found');
    }

    // Evaluate answer using game engine
    const result = evaluatePuzzle(node.puzzle, dto.answer);

    // Log attempt
    await this.prisma.puzzleAttempt.create({
      data: {
        sessionId,
        puzzleId: dto.puzzleId,
        answer: dto.answer as any,
        correct: result.correct,
        score: result.score || 0,
        timeSpentMs: dto.timeSpentMs,
      },
    });

    // Get effects from puzzle success/failure
    const effects = result.correct
      ? node.puzzle.success?.effects || []
      : node.puzzle.failure?.effects || [];

    return {
      correct: result.correct,
      score: result.score,
      message: result.message,
      effects,
    };
  }
}
