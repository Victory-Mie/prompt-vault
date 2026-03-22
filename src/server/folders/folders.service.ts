import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreateFolderDto, UpdateFolderDto, FolderResponseDto } from './folders.dto.js';

/**
 * FoldersService - Folder management business logic
 * Handles CRUD operations for folders
 */
@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all folders for a user
   * GET /api/folders
   * @param userId - User ID
   * @returns List of folders
   */
  async findAll(userId: string): Promise<FolderResponseDto[]> {
    return this.prisma.folder.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Get a single folder by ID
   * GET /api/folders/:id
   * @param id - Folder ID
   * @param userId - User ID
   * @returns Folder details
   */
  async findOne(id: string, userId: string): Promise<FolderResponseDto> {
    const folder = await this.prisma.folder.findFirst({
      where: { id, userId },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        parent: true,
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    return folder;
  }

  /**
   * Create a new folder
   * POST /api/folders
   * @param dto - Folder data
   * @param userId - User ID
   * @returns Created folder
   */
  async create(dto: CreateFolderDto, userId: string): Promise<FolderResponseDto> {
    // If parentId is provided, verify it belongs to the user
    if (dto.parentId) {
      const parent = await this.prisma.folder.findFirst({
        where: { id: dto.parentId, userId },
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    return this.prisma.folder.create({
      data: {
        name: dto.name,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
        userId,
      },
      include: {
        children: true,
        parent: true,
      },
    });
  }

  /**
   * Update a folder
   * PUT /api/folders/:id
   * @param id - Folder ID
   * @param dto - Updated folder data
   * @param userId - User ID
   * @returns Updated folder
   */
  async update(id: string, dto: UpdateFolderDto, userId: string): Promise<FolderResponseDto> {
    // Verify folder belongs to user
    const existing = await this.prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Folder not found');
    }

    // If updating parentId, verify new parent belongs to user
    if (dto.parentId && dto.parentId !== existing.parentId) {
      const parent = await this.prisma.folder.findFirst({
        where: { id: dto.parentId, userId },
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }

      // Prevent circular reference (can't set self as parent)
      if (dto.parentId === id) {
        throw new ForbiddenException('Folder cannot be its own parent');
      }
    }

    return this.prisma.folder.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder,
      },
      include: {
        children: true,
        parent: true,
      },
    });
  }

  /**
   * Delete a folder
   * DELETE /api/folders/:id
   * @param id - Folder ID
   * @param userId - User ID
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify folder belongs to user
    const folder = await this.prisma.folder.findFirst({
      where: { id, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Delete folder (prompts will have folderId set to null due to onDelete: SetNull)
    await this.prisma.folder.delete({
      where: { id },
    });
  }
}
