import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreatePromptDto, UpdatePromptDto, PromptResponseDto, ImportPromptItemDto, ExportPromptsDto } from './prompts.dto.js';

/**
 * PromptsService - Prompt management business logic
 * Handles CRUD operations for prompts
 */
@Injectable()
export class PromptsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all prompts for a user, optionally filtered by folder
   * GET /api/prompts
   * @param userId - User ID
   * @param folderId - Optional folder ID filter
   * @returns List of prompts
   */
  async findAll(userId: string, folderId?: string): Promise<PromptResponseDto[]> {
    return this.prisma.prompt.findMany({
      where: {
        userId,
        ...(folderId ? { folderId } : {}),
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        folder: true,
        tags: true,
      },
    });
  }

  /**
   * Get a single prompt by ID
   * GET /api/prompts/:id
   * @param id - Prompt ID
   * @param userId - User ID
   * @returns Prompt details
   */
  async findOne(id: string, userId: string): Promise<PromptResponseDto> {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, userId },
      include: {
        folder: true,
        tags: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10,
        },
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    return prompt;
  }

  /**
   * Create a new prompt
   * POST /api/prompts
   * @param dto - Prompt data
   * @param userId - User ID
   * @returns Created prompt
   */
  async create(dto: CreatePromptDto, userId: string): Promise<PromptResponseDto> {
    // If folderId is provided, verify it belongs to the user
    if (dto.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, userId },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    // Handle tags
    const tagConnections = dto.tagIds?.map((tagId) => ({ id: tagId })) || [];

    return this.prisma.prompt.create({
      data: {
        title: dto.title,
        content: dto.content,
        description: dto.description,
        folderId: dto.folderId,
        modelConfig: dto.modelConfig || {},
        isPublic: dto.isPublic || false,
        isFavorite: dto.isFavorite || false,
        isPinned: dto.isPinned || false,
        userId,
        tags: {
          connect: tagConnections,
        },
      },
      include: {
        folder: true,
        tags: true,
      },
    });
  }

  /**
   * Update a prompt
   * PUT /api/prompts/:id
   * @param id - Prompt ID
   * @param dto - Updated prompt data
   * @param userId - User ID
   * @returns Updated prompt
   */
  async update(id: string, dto: UpdatePromptDto, userId: string): Promise<PromptResponseDto> {
    // Verify prompt belongs to user
    const existing = await this.prisma.prompt.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Prompt not found');
    }

    // If folderId is provided, verify it belongs to the user
    if (dto.folderId && dto.folderId !== existing.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, userId },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    // Handle tags
    const tagUpdate = dto.tagIds
      ? {
          set: dto.tagIds.map((tagId) => ({ id: tagId })),
        }
      : undefined;

    // Create a version if content changed
    if (dto.content && dto.content !== existing.content) {
      const latestVersion = await this.prisma.promptVersion.findFirst({
        where: { promptId: id },
        orderBy: { versionNumber: 'desc' },
      });

      await this.prisma.promptVersion.create({
        data: {
          promptId: id,
          content: existing.content,
          versionNumber: (latestVersion?.versionNumber || 0) + 1,
        },
      });
    }

    return this.prisma.prompt.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        description: dto.description,
        folderId: dto.folderId,
        modelConfig: dto.modelConfig,
        isPublic: dto.isPublic,
        isFavorite: dto.isFavorite,
        isPinned: dto.isPinned,
        tags: tagUpdate,
      },
      include: {
        folder: true,
        tags: true,
      },
    });
  }

  /**
   * Delete a prompt
   * DELETE /api/prompts/:id
   * @param id - Prompt ID
   * @param userId - User ID
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify prompt belongs to user
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, userId },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }

    await this.prisma.prompt.delete({
      where: { id },
    });
  }

  /**
   * Import prompts from JSON
   * POST /api/prompts/import
   * @param prompts - Array of prompts to import
   * @param userId - User ID
   * @param folderId - Optional folder ID to import into
   * @returns Import result with count
   */
  async importPrompts(
    prompts: ImportPromptItemDto[],
    userId: string,
    folderId?: string,
  ): Promise<{ success: boolean; count: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    // If folderId is provided, verify it belongs to the user
    if (folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: folderId, userId },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    // Process each prompt
    for (let i = 0; i < prompts.length; i++) {
      const item = prompts[i];
      
      try {
        // Handle tags - create if not exist
        const tagConnections = [];
        if (item.tags && item.tags.length > 0) {
          for (const tagName of item.tags) {
            // Find or create tag
            let tag = await this.prisma.tag.findFirst({
              where: { userId, name: tagName },
            });

            if (!tag) {
              tag = await this.prisma.tag.create({
                data: { userId, name: tagName },
              });
            }
            tagConnections.push({ id: tag.id });
          }
        }

        await this.prisma.prompt.create({
          data: {
            title: item.title,
            content: item.content,
            description: item.description || null,
            folderId: folderId || null,
            modelConfig: item.modelConfig || {},
            isPublic: item.isPublic || false,
            isFavorite: item.isFavorite || false,
            isPinned: item.isPinned || false,
            userId,
            tags: {
              connect: tagConnections,
            },
          },
        });
        successCount++;
      } catch (error) {
        errors.push(`Prompt "${item.title}" (index ${i}): ${(error as Error).message}`);
      }
    }

    return {
      success: successCount > 0,
      count: successCount,
      errors,
    };
  }

  /**
   * Export prompts to JSON
   * GET /api/prompts/export
   * @param userId - User ID
   * @param folderId - Optional folder ID to filter by
   * @returns Export data
   */
  async exportPrompts(userId: string, folderId?: string): Promise<ExportPromptsDto> {
    const prompts = await this.prisma.prompt.findMany({
      where: {
        userId,
        ...(folderId ? { folderId } : {}),
      },
      include: {
        tags: true,
      },
    });

    // Transform to export format
    const exportPrompts: ImportPromptItemDto[] = prompts.map((prompt) => ({
      title: prompt.title,
      content: prompt.content,
      description: prompt.description || undefined,
      modelConfig: prompt.modelConfig || undefined,
      isPublic: prompt.isPublic || undefined,
      isFavorite: prompt.isFavorite || undefined,
      isPinned: prompt.isPinned || undefined,
      tags: prompt.tags.map((tag) => tag.name),
    }));

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: exportPrompts.length,
      prompts: exportPrompts,
    };
  }
}
