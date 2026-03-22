import { Module } from '@nestjs/common';
import { PromptsController } from './prompts.controller.js';
import { PromptsService } from './prompts.service.js';
import { PrismaModule } from '../common/prisma/prisma.module.js';

/**
 * PromptsModule - Prompt management module
 * Handles CRUD operations for prompts
 */
@Module({
  imports: [PrismaModule],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
