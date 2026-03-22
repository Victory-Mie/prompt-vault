import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FoldersModule } from './folders/folders.module.js';
import { PromptsModule } from './prompts/prompts.module.js';
import { TagsModule } from './tags/tags.module.js';
import { SearchModule } from './search/search.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    FoldersModule,
    PromptsModule,
    TagsModule,
    SearchModule,
  ],
})
export class AppModule {}
