import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

/**
 * SearchResultItem - Single search result
 */
interface SearchResultItem {
  id: string;
  type: 'prompt' | 'folder' | 'tag';
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SearchResponse - Search API response
 */
interface SearchResponse {
  results: SearchResultItem[];
  total: number;
}

/**
 * SearchService - Search business logic
 * Handles searching across prompts, folders, and tags
 */
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Search for prompts, folders, and tags
   * GET /api/search?q=xxx
   * @param query - Search query
   * @param userId - User ID
   * @returns Search results
   */
  async search(query: string, userId: string): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0 };
    }

    const searchTerm = `%${query.trim()}%`;
    const results: SearchResultItem[] = [];

    // Search prompts
    const prompts = await this.prisma.prompt.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: searchTerm } },
          { content: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    results.push(
      ...prompts.map((p) => ({
        id: p.id,
        type: 'prompt' as const,
        title: p.title,
        description: p.description || undefined,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    );

    // Search folders
    const folders = await this.prisma.folder.findMany({
      where: {
        userId,
        name: { contains: searchTerm },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    results.push(
      ...folders.map((f) => ({
        id: f.id,
        type: 'folder' as const,
        title: f.name,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    );

    // Search tags
    const tags = await this.prisma.tag.findMany({
      where: {
        userId,
        name: { contains: searchTerm },
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    results.push(
      ...tags.map((t) => ({
        id: t.id,
        type: 'tag' as const,
        title: t.name,
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
      })),
    );

    // Sort by relevance (exact match first, then by updatedAt)
    const sortedResults = results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query.toLowerCase();
      const bExact = b.title.toLowerCase() === query.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return {
      results: sortedResults,
      total: sortedResults.length,
    };
  }
}
