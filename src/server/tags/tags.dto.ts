import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for creating a tag
 */
export class CreateTagDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}

/**
 * Tag response DTO  
 */
export class TagResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  color!: string;
  createdAt!: Date;
}
