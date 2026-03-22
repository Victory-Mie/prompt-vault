import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller.js';
import { FoldersService } from './folders.service.js';
import { PrismaModule } from '../common/prisma/prisma.module.js';

/**
 * FoldersModule - Folder management module
 * Handles CRUD operations for folders
 */
@Module({
  imports: [PrismaModule],
  controllers: [FoldersController],
  providers: [FoldersService],
  exports: [FoldersService],
})
export class FoldersModule {}
