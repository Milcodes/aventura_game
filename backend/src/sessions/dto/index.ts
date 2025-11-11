import { IsString, IsObject, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  storyId: string;

  @IsObject()
  @IsOptional()
  initialState?: any;
}

export class UpdateStateDto {
  @IsObject()
  state: any;
}
