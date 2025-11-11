import { IsString, IsObject, IsBoolean, IsOptional } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsObject()
  content: any; // Story JSON

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateStoryDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  content?: any;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
