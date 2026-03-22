import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { PrismaModule } from '../common/prisma/prisma.module.js';

/**
 * SearchModule - Search module
 * Handles searching across prompts, folders, and tags
 */
@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
