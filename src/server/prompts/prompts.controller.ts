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
} from '@nestjs/common';
import { PromptsService } from './prompts.service.js';
import { CreatePromptDto, UpdatePromptDto, ImportPromptsDto } from './prompts.dto.js';

/**
 * PromptsController - Prompt API endpoints
 * GET /api/prompts - List all prompts
 * POST /api/prompts - Create a prompt
 * GET /api/prompts/:id - Get prompt details
 * PUT /api/prompts/:id - Update a prompt
 * DELETE /api/prompts/:id - Delete a prompt
 * POST /api/prompts/import - Import prompts from JSON
 * GET /api/prompts/export - Export prompts to JSON
 */
// TODO: Add JWT Auth Guard
@Controller('api/prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  /**
   * Get all prompts for the current user
   * GET /api/prompts?userId=xxx&folderId=xxx
   */
  @Get()
  async findAll(
    @Query('userId') userId: string,
    @Query('folderId') folderId?: string,
  ) {
    return this.promptsService.findAll(userId, folderId);
  }

  /**
   * Get a single prompt by ID
   * GET /api/prompts/:id?userId=xxx
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId: string) {
    return this.promptsService.findOne(id, userId);
  }

  /**
   * Create a new prompt
   * POST /api/prompts
   */
  @Post()
  async create(@Body() dto: CreatePromptDto, @Query('userId') userId: string) {
    return this.promptsService.create(dto, userId);
  }

  /**
   * Update a prompt
   * PUT /api/prompts/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePromptDto,
    @Query('userId') userId: string,
  ) {
    return this.promptsService.update(id, dto, userId);
  }

  /**
   * Delete a prompt
   * DELETE /api/prompts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('userId') userId: string) {
    return this.promptsService.remove(id, userId);
  }

  /**
   * Import prompts from JSON
   * POST /api/prompts/import?userId=xxx
   */
  @Post('import')
  async import(
    @Body() dto: ImportPromptsDto,
    @Query('userId') userId: string,
  ) {
    return this.promptsService.importPrompts(dto.prompts, userId, dto.folderId);
  }

  /**
   * Export prompts to JSON
   * GET /api/prompts/export?userId=xxx&folderId=xxx
   */
  @Get('export')
  async export(
    @Query('userId') userId: string,
    @Query('folderId') folderId?: string,
  ) {
    return this.promptsService.exportPrompts(userId, folderId);
  }
}
