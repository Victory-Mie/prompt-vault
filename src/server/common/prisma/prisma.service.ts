import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../../lib/prisma';

/**
 * PrismaService - NestJS service that extends PrismaClient
 * Provides database access with lifecycle management
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  /**
   * Called when the module is initialized
   * Connects to the database
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Called when the module is destroyed
   * Disconnects from the database
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
