import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FoldersService } from './folders.service.js';
import { CreateFolderDto, UpdateFolderDto } from './folders.dto.js';

/**
 * FoldersController - Folder API endpoints
 * GET /api/folders - List all folders
 * POST /api/folders - Create a folder
 * GET /api/folders/:id - Get folder details
 * PUT /api/folders/:id - Update a folder
 * DELETE /api/folders/:id - Delete a folder
 */
// TODO: Add JWT Auth Guard
@Controller('api/folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  /**
   * Get all folders for the current user
   * GET /api/folders?userId=xxx
   */
  @Get()
  async findAll(@Query('userId') userId: string) {
    return this.foldersService.findAll(userId);
  }

  /**
   * Get a single folder by ID
   * GET /api/folders/:id?userId=xxx
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return this.foldersService.findOne(id, userId);
  }

  /**
   * Create a new folder
   * POST /api/folders
   */
  @Post()
  async create(@Body() dto: CreateFolderDto, @Query('userId') userId: string) {
    return this.foldersService.create(dto, userId);
  }

  /**
   * Update a folder
   * PUT /api/folders/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
    @Query('userId') userId: string,
  ) {
    return this.foldersService.update(id, dto, userId);
  }

  /**
   * Delete a folder
   * DELETE /api/folders/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.foldersService.remove(id, userId);
  }
}
