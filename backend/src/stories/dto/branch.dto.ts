import { IsString, IsEnum, IsInt, IsOptional, IsArray } from 'class-validator';

export enum BranchType {
  LOCATION = 'LOCATION', // Ház, Kastély, Erdő
  ROOM = 'ROOM',         // Szoba egy location-ben
  EVENT = 'EVENT',       // Időbeli esemény
}

export enum ExitType {
  NODE = 'NODE',   // Visszatér node-hoz
  DEATH = 'DEATH', // Halál
}

export class CreateBranchDto {
  @IsString()
  storyId: string;

  @IsString()
  name: string; // User-written: "Rejtélyes Ház", "Barna Szoba"

  @IsEnum(BranchType)
  type: BranchType;

  @IsString()
  entryNodeId: string; // Mainline or parent branch node ID

  @IsArray()
  exitNodeIds: string[]; // ["mainline_id"] or ["DEATH"]

  @IsEnum(ExitType)
  @IsOptional()
  exitType?: ExitType;

  @IsString()
  @IsOptional()
  parentBranchId?: string; // For nesting

  @IsInt()
  @IsOptional()
  depth?: number; // Will be calculated from parent, max 3
}

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(BranchType)
  @IsOptional()
  type?: BranchType;

  @IsString()
  @IsOptional()
  entryNodeId?: string;

  @IsArray()
  @IsOptional()
  exitNodeIds?: string[];

  @IsEnum(ExitType)
  @IsOptional()
  exitType?: ExitType;
}
