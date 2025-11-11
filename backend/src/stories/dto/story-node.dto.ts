import { IsString, IsInt, IsOptional, IsArray, IsObject } from 'class-validator';

export class CreateStoryNodeDto {
  @IsString()
  storyId: string;

  @IsString()
  @IsOptional()
  branchId?: string; // null = mainline node

  @IsInt()
  order: number;

  @IsString()
  label: string; // "Születés", "Gyerekkor", "Barna Szoba belül"

  @IsString()
  @IsOptional()
  mediaType?: string; // "image", "video", "text"

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  storyText?: string;

  @IsArray()
  @IsOptional()
  decisions?: any[]; // [{text, targetNodeId, modalConfig, conditions}]

  @IsArray()
  @IsOptional()
  effects?: any[]; // [{type: 'ADD_ITEM', itemId, quantity}]
}

export class UpdateStoryNodeDto {
  @IsInt()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  mediaType?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  storyText?: string;

  @IsArray()
  @IsOptional()
  decisions?: any[];

  @IsArray()
  @IsOptional()
  effects?: any[];
}

export class ReorderNodesDto {
  @IsArray()
  nodeOrders: Array<{ nodeId: string; order: number }>;
}
