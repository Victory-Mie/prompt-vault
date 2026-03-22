import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CreateTagDto, TagResponseDto } from './tags.dto.js';

/**
 * TagsService - Tag management business logic
 * Handles CRUD operations for tags
 */
@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all tags for a user
   * GET /api/tags
   * @param userId - User ID
   * @returns List of tags
   */
  async findAll(userId: string): Promise<TagResponseDto[]> {
    return this.prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new tag
   * POST /api/tags
   * @param dto - Tag data
   * @param userId - User ID
   * @returns Created tag
   */
  async create(dto: CreateTagDto, userId: string): Promise<TagResponseDto> {
    // Check if tag with same name already exists for this user
    const existing = await this.prisma.tag.findUnique({
      where: {
        userId_name: {
          userId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Tag with this name already exists');
    }

    return this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color || '#58A6FF',
        userId,
      },
    });
  }

  /**
   * Delete a tag
   * DELETE /api/tags/:id
   * @param id - Tag ID
   * @param userId - User ID
   */
  async remove(id: string, userId: string): Promise<void> {
    // Verify tag belongs to user
    const tag = await this.prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.tag.delete({
      where: { id },
    });
  }
}
