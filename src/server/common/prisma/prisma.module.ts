import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * PrismaModule - NestJS module for Prisma database connection
 * Provides PrismaService to all modules that import PrismaModule
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
