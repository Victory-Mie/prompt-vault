import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service.js';

/**
 * SearchController - Search API endpoint
 * GET /api/search?q=xxx - Search prompts, folders, and tags
 */
// TODO: Add JWT Auth Guard
@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Search for prompts, folders, and tags
   * GET /api/search?q=xxx&userId=xxx
   */
  @Get()
  async search(@Query('q') query: string, @Query('userId') userId: string) {
    return this.searchService.search(query, userId);
  }
}
