import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller.js';
import { TagsService } from './tags.service.js';
import { PrismaModule } from '../common/prisma/prisma.module.js';

/**
 * TagsModule - Tag management module
 * Handles CRUD operations for tags
 */
@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
