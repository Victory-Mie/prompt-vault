import { IsString, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromptDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  folderId?: string;

  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @IsObject()
  @IsOptional()
  modelConfig?: any;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

export class UpdatePromptDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  folderId?: string;

  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @IsObject()
  @IsOptional()
  modelConfig?: any;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

export class PromptResponseDto {
  id!: string;
  userId!: string;
  title!: string;
  content!: string;
  description!: string | null;
  folderId!: string | null;
  isPublic!: boolean;
  isFavorite!: boolean;
  isPinned!: boolean;
  modelConfig!: any;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * DTO for importing prompts from JSON
 */
export class ImportPromptItemDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  modelConfig?: any;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class ImportPromptsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPromptItemDto)
  prompts!: ImportPromptItemDto[];

  @IsString()
  @IsOptional()
  folderId?: string;
}

/**
 * DTO for export response
 */
export class ExportPromptsDto {
  version!: string;
  exportedAt!: string;
  count!: number;
  prompts!: ImportPromptItemDto[];
}
