import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TagsService } from './tags.service.js';
import { CreateTagDto } from './tags.dto.js';

/**
 * TagsController - Tag API endpoints
 * GET /api/tags - List all tags
 * POST /api/tags - Create a tag
 * DELETE /api/tags/:id - Delete a tag
 */
// TODO: Add JWT Auth Guard
@Controller('api/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Get all tags for the current user
   * GET /api/tags?userId=xxx
   */
  @Get()
  async findAll(@Query('userId') userId: string) {
    return this.tagsService.findAll(userId);
  }

  /**
   * Create a new tag
   * POST /api/tags
   */
  @Post()
  async create(@Body() dto: CreateTagDto, @Query('userId') userId: string) {
    return this.tagsService.create(dto, userId);
  }

  /**
   * Delete a tag
   * DELETE /api/tags/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.tagsService.remove(id, userId);
  }
}
