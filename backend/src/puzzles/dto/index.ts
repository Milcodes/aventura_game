import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ValidatePuzzleDto {
  @IsString()
  puzzleId: string;

  answer: any; // Can be any type depending on puzzle

  @IsNumber()
  @IsOptional()
  timeSpentMs?: number;
}
