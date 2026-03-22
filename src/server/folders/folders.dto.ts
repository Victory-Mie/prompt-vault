import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

/**
 * DTO for creating a folder
 */
export class CreateFolderDto {
  @IsString()
  name!: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

/**
 * DTO for updating a folder
 */
export class UpdateFolderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

/**
 * Folder response DTO
 */
export class FolderResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  parentId!: string | null;
  sortOrder!: number;
  createdAt!: Date;
  updatedAt!: Date;
  children?: FolderResponseDto[];
  parent?: FolderResponseDto | null;
}
