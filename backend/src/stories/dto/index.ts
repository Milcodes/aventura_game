import { IsString, IsObject, IsBoolean, IsOptional, IsEnum, IsInt } from 'class-validator';

export enum StoryStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateStoryDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsObject()
  @IsOptional()
  content?: any; // Legacy: Full story JSON (optional)

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateStoryDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  content?: any;

  @IsEnum(StoryStatus)
  @IsOptional()
  status?: StoryStatus;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsInt()
  @IsOptional()
  version?: number;
}

// Re-export DTOs from other files
export * from './story-node.dto';
export * from './branch.dto';
