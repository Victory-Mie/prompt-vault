# Prompt Vault 技术完全手册

> **文档版本**: v1.0  
> **项目名称**: Prompt Vault  
> **状态**: 完整技术规范  
> **编写人**: Lily 👩‍💻  
> **日期**: 2026-03-11

---

## 目录

1. 项目概述
2. 技术架构
3. 技术栈详解
4. 系统架构设计
5. 数据模型
6. API 接口规范
7. 核心功能实现方案
8. 安全方案
9. 性能优化策略
10. 前端架构
11. 后端架构
12. 搜索系统
13. AI 测试模块
14. 版本管理
15. 部署方案
16. 开发规范

---

## 1. 项目概述

### 1.1 产品定位

**Prompt Vault** 是一款面向 AI 开发者、内容创作者和企业用户的 **Prompt 管理与优化平台**。核心价值在于帮助用户 **存储、结构化组织、测试优化和复用高质量 Prompt**，从而提升 AI 应用的生产效率和输出质量。

> 🎯 一句话定位：**你的 Prompt 知识库 + 调优实验室**

### 1.2 核心功能矩阵

| 功能模块 | MVP (v0.1) | v1.0 | v1.1 |
|----------|------------|------|------|
| Prompt 存储 | ✅ CRUD + Markdown | ✅ 全功能 | ✅ 全功能 |
| 分类管理 | ✅ 文件夹 + 标签 | ✅ 全功能 | ✅ 全功能 |
| 搜索 | ✅ 关键词搜索 | ✅ 全文搜索 | ✅ 智能搜索 |
| 测试 | ✅ 单模型测试 | ✅ 多模型 | ✅ A/B 测试 |
| 版本历史 | ✅ 10 版本 | ✅ 20 版本 | ✅ 无限 |
| 用户系统 | ✅ 邮箱注册 | ✅ OAuth | ✅ SSO |
| 团队协作 | ❌ | ✅ 基础 | ✅ 完整 |
| 模板市场 | ❌ | ✅ 原型 | ✅ 完整 |

---

## 2. 技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client (Web/Mobile)                         │
│                    (Next.js SPA / PWA)                                   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CDN (Cloudflare)                                 │
│                    (SSL Termination, Cache, WAF)                        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       API Gateway (Next.js API Routes)                   │
│                 (Rate Limiting, Auth, Request Logging)                   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    Auth Module     │ │   Prompt Module    │ │   Test Module      │
│  (认证/鉴权/JWT)    │ │  (CRUD/版本/搜索)  │ │ (AI API 代理)      │
└─────────┬───────────┘ └──────────┬──────────┘ └──────────┬──────────┘
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    PostgreSQL       │ │      Redis          │ │   External AI      │
│   (主数据库)        │ │   (缓存/会话/队列)   │ │   (OpenAI/Claude)  │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│    MeiliSearch      │
│   (搜索引擎)        │
└─────────────────────┘
```

### 2.2 模块职责划分

| 模块 | 职责 | 核心技术 | 暴露接口 |
|------|------|----------|----------|
| **Auth Module** | 用户认证、授权、Token 管理 | NextAuth.js, JWT, bcrypt | /api/v1/auth/* |
| **Prompt Module** | Prompt 生命周期管理 | Prisma, MeiliSearch | /api/v1/prompts/* |
| **Version Module** | 版本控制与历史 | Prisma | /api/v1/prompts/:id/versions/* |
| **Test Module** | AI 模型调用、测试执行 | LangChain.js, Vercel AI SDK | /api/v1/test/* |
| **Folder Module** | 分类目录管理 | Prisma | /api/v1/folders/* |
| **Tag Module** | 标签系统 | Prisma | /api/v1/tags/* |
| **Team Module** | 团队协作、权限管理 | Prisma | /api/v1/teams/* |
| **Search Module** | 全文搜索 | MeiliSearch | /api/v1/search |

---

## 3. 技术栈详解

### 3.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | ^14.0.0 | React 框架，App Router |
| **React** | ^18.2.0 | UI 库 |
| **TypeScript** | ^5.3.0 | 类型安全 |
| **Tailwind CSS** | ^3.4.0 | 样式框架 |
| **Shadcn/ui** | latest | UI 组件库 |
| **Zustand** | ^4.4.0 | 状态管理 |
| **React Query** | ^5.0.0 | 服务端状态 |
| **React Markdown** | ^9.0.0 | Markdown 渲染 |
| **Shiki** | ^1.0.0 | 代码高亮 |
| **Monaco Editor** | ^0.45.0 | 代码编辑器 |
| **Lucide React** | ^0.300.0 | 图标库 |

### 3.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **NestJS** | ^10.0.0 | Node.js 框架 |
| **Prisma** | ^5.7.0 | ORM |
| **PostgreSQL** | ^15.0 | 主数据库 |
| **Redis** | ^7.0 | 缓存/会话 |
| **MeiliSearch** | ^1.4 | 搜索引擎 |
| **JWT** | ^0.13.0 | Token 认证 |
| **bcrypt** | ^5.1.1 | 密码加密 |
| **LangChain.js** | ^0.1.0 | AI SDK |
| **Vercel AI SDK** | ^3.3.0 | AI 接口统一 |

---

## 4. 系统架构设计

### 4.1 请求处理流程

```
用户请求 → CDN缓存 → Rate Limiting → Auth Middleware → 业务逻辑 → DB/Cache → Response
```

### 4.2 服务分层

| 层级 | 职责 | 实现方式 |
|------|------|----------|
| **接入层** | 请求接收、路由分发 | Next.js API Routes / NestJS Gateway |
| **认证层** | Token 验证、权限校验 | JWT Middleware |
| **业务层** | 核心业务逻辑 | Service Classes |
| **数据层** | 数据库操作、缓存 | Prisma Repository / Redis Client |
| **外部服务层** | AI API 调用、搜索 | LangChain / MeiliSearch Client |

---

## 5. 数据模型

### 5.1 Prisma Schema

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String?
  name         String?
  avatarUrl    String?
  provider     String    @default("email")
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  prompts       Prompt[]
  folders       Folder[]
  tags          Tag[]
  apiKeys       ApiKey[]
  testRecords   TestRecord[]
  teams         TeamMember[]
  ownedTeams    Team[]    @relation("TeamOwner")
}

model Prompt {
  id          String   @id @default(uuid())
  userId      String
  folderId    String?
  title       String
  content     String   @db.Text
  description String?  @db.Text
  modelConfig Json     @default("{}")
  isPublic    Boolean  @default(false)
  isFavorite  Boolean  @default(false)
  isPinned    Boolean  @default(false)
  usageCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  folder      Folder?  @relation(fields: [folderId], references: [id], onDelete: SetNull)
  tags        Tag[]    @relation("PromptTags")
  versions    PromptVersion[]
  testRecords TestRecord[]
  
  @@index([userId])
  @@index([folderId])
}

model Folder {
  id        String   @id @default(uuid())
  userId    String
  name      String
  parentId  String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent    Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children  Folder[] @relation("FolderHierarchy")
  prompts   Prompt[]
  
  @@index([userId])
}

model Tag {
  id        String   @id @default(uuid())
  userId    String
  name      String
  color     String   @default("#58A6FF")
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  prompts   Prompt[] @relation("PromptTags")

  @@unique([userId, name])
}

model PromptVersion {
  id             String   @id @default(uuid())
  promptId       String
  content        String   @db.Text
  versionNumber  Int
  changeNote     String?
  createdAt      DateTime @default(now())

  prompt         Prompt   @relation(fields: [promptId], references: [id], onDelete: Cascade)

  @@unique([promptId, versionNumber])
  @@index([promptId])
}

model TestRecord {
  id            String   @id @default(uuid())
  promptId      String
  userId        String
  modelProvider String
  modelName     String
  inputText     String   @db.Text
  outputText    String?  @db.Text
  modelConfig   Json?
  tokensUsed    Int?
  latencyMs     Int?
  rating        Int?
  createdAt     DateTime @default(now())

  prompt        Prompt   @relation(fields: [promptId], references: [id], onDelete: Cascade)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([promptId])
  @@index([userId])
}

model Team {
  id          String   @id @default(uuid())
  name        String
  ownerId     String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner       User          @relation("TeamOwner", fields: [ownerId], references: [id])
  members     TeamMember[]
  templates   Template[]
}

model TeamMember {
  teamId   String
  userId   String
  role     String
  joinedAt DateTime @default(now())

  team     Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([teamId, userId])
}
```

---

## 6. API 接口规范

### 6.1 接口约定

- **Base URL**: /api/v1
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: application/json

### 6.2 响应格式

```json
// 成功
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}

// 错误
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "错误描述" }
}
```

### 6.3 接口列表

| 模块 | 方法 | 路径 | 认证 |
|------|------|------|------|
| Auth | POST | /auth/register | ✗ |
| Auth | POST | /auth/login | ✗ |
| Auth | POST | /auth/refresh | ✗ |
| Auth | GET | /auth/me | ✓ |
| Users | GET | /users/me | ✓ |
| Users | PATCH | /users/me | ✓ |
| Users | POST | /users/me/api-keys | ✓ |
| Prompts | GET | /prompts | ✓ |
| Prompts | GET | /prompts/:id | ✓ |
| Prompts | POST | /prompts | ✓ |
| Prompts | PATCH | /prompts/:id | ✓ |
| Prompts | DELETE | /prompts/:id | ✓ |
| Prompts | POST | /prompts/:id/versions | ✓ |
| Prompts | GET | /prompts/:id/versions | ✓ |
| Folders | GET | /folders | ✓ |
| Folders | POST | /folders | ✓ |
| Tags | GET | /tags | ✓ |
| Tags | POST | /tags | ✓ |
| Search | GET | /search | ✓ |
| Test | POST | /test/run | ✓ |
| Test | POST | /test/run-ab | ✓ |
| Test | GET | /test/records | ✓ |

---

## 7. 核心功能实现方案

### 7.1 Prompt 存储与 Markdown 编辑

变量占位符检测:
```typescript
const variableRegex = /\{\{([^}]+)\}\}/g;

function replaceVariables(content: string, values: Record<string, string>): string {
  return content.replace(variableRegex, (_, key) => values[key.trim()] || '');
}
```

### 7.2 全文搜索实现

```typescript
async function syncPromptToSearch(prompt: Prompt) {
  await meiliClient.index('prompts').addOrUpdateDocument({
    id: prompt.id,
    userId: prompt.userId,
    title: prompt.title,
    content: prompt.content,
    tags: prompt.tags.map(t => t.name)
  });
}

async function searchPrompts(userId: string, query: string) {
  return meiliClient.index('prompts').search(query, {
    filter: `userId = ${userId}`,
    attributesToHighlight: ['title', 'content']
  });
}
```

### 7.3 版本管理

```typescript
async function createVersion(promptId: string, content: string) {
  const latest = await prisma.promptVersion.findFirst({
    where: { promptId },
    orderBy: { versionNumber: 'desc' }
  });
  const newVersionNumber = (latest?.versionNumber || 0) + 1;
  return prisma.promptVersion.create({
    data: { promptId, content, versionNumber: newVersionNumber }
  });
}
```

### 7.4 AI 测试调用

```typescript
async function runTest(prompt: Prompt, inputText: string, config: ModelConfig) {
  const apiKey = await getUserApiKey(prompt.userId, config.provider);
  const processedContent = replaceVariables(prompt.content, { input: inputText });
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: processedContent },
        { role: 'user', content: inputText }
      ]
    })
  });
  
  return prisma.testRecord.create({
    data: { promptId: prompt.id, outputText: response.choices[0].message.content }
  });
}
```

---

## 8. 安全方案

### 8.1 认证与授权

JWT 双 Token 方案:
- Access Token: 15 分钟有效期
- Refresh Token: 7 天有效期，存 HttpOnly Cookie

```typescript
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.slice(7);
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 8.2 数据加密

| 数据类型 | 加密方式 |
|----------|----------|
| 传输层 | TLS 1.3 |
| 密码 | bcrypt (12轮) |
| API Key | AES-256-GCM |

### 8.3 权限控制

| 角色 | 权限 |
|------|------|
| Owner | 管理团队、删除、成员管理 |
| Admin | 成员管理、内容审核 |
| Member | 创建/编辑/删除团队 Prompt |
| Viewer | 仅查看和复制 |

### 8.4 API 安全

Rate Limiting:
- 登录: 5次/分钟
- 测试: 10次/分钟
- 通用: 100次/分钟

---

## 9. 性能优化策略

### 9.1 前端优化

| 策略 | 实现 | 收益 |
|------|------|------|
| 首屏渲染 | Next.js Server Components | FCP < 1s |
| 代码分割 | Dynamic Import | JS -40% |
| 缓存 | SWR / React Query | 请求 -90% |
| 虚拟列表 | react-window | 长列表流畅 |

### 9.2 后端优化

| 策略 | 收益 |
|------|------|
| 数据库索引 | 查询 10x |
| Redis 缓存 | 响应 5x |
| MeiliSearch | 搜索 < 50ms |
| 连接池 | 并发 3x |

---

## 10. 前端架构

### 10.1 目录结构

```
src/web/
├── app/                    # Next.js App Router
│   ├── (auth)/           # 认证页面组
│   ├── (dashboard)/      # Dashboard 页面组
│   └── api/              # API 路由
├── components/           # React 组件
│   ├── ui/              # Shadcn/ui 组件
│   ├── prompts/         # Prompt 相关组件
│   ├── editor/          # 编辑器组件
│   └── layout/          # 布局组件
├── lib/                  # 工具函数
│   ├── api.ts           # API 客户端
│   ├── store.ts         # Zustand store
│   └── utils.ts
└── hooks/               # 自定义 Hooks
```

### 10.2 状态管理

```typescript
// lib/store.ts - Zustand Store
import { create } from 'zustand';

interface PromptStore {
  prompts: Prompt[];
  currentPrompt: Prompt | null;
  setPrompts: (prompts: Prompt[]) => void;
  setCurrentPrompt: (prompt: Prompt | null) => void;
}

export const usePromptStore = create<PromptStore>((set) => ({
  prompts: [],
  currentPrompt: null,
  setPrompts: (prompts) => set({ prompts }),
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt })
}));
```

---

## 11. 后端架构

### 11.1 目录结构

```
src/server/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── strategies/
├── prompts/
│   ├── prompts.module.ts
│   ├── prompts.controller.ts
│   ├── prompts.service.ts
│   └── dto/
├── folders/
├── tags/
├── search/
├── test/
│   ├── test.module.ts
│   ├── test.controller.ts
│   ├── test.service.ts
│   └── providers/
│       ├── openai.provider.ts
│       └── anthropic.provider.ts
└── common/
    ├── dto/
    ├── guards/
    └── filters/
```

### 11.2 NestJS 模块示例

```typescript
// prompts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromptDto } from './dto/create-prompt.dto';

@Injectable()
export class PromptsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePromptDto) {
    return this.prisma.prompt.create({
      data: { ...dto, userId },
      include: { tags: true }
    });
  }

  async findAll(userId: string) {
    return this.prisma.prompt.findMany({
      where: { userId },
      include: { tags: true, folder: true }
    });
  }

  async findOne(id: string, userId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, userId },
      include: { tags: true, versions: true }
    });
    
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }
    
    return prompt;
  }

  async update(id: string, userId: string, dto: UpdatePromptDto) {
    await this.findOne(id, userId);
    
    return this.prisma.prompt.update({
      where: { id },
      data: dto,
      include: { tags: true }
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.prompt.delete({ where: { id } });
  }
}
```

---

## 12. 搜索系统

### 12.1 MeiliSearch 配置

```typescript
const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey'
});

async function initIndex() {
  await client.createIndex('prompts', { primaryKey: 'id' });
  
  const index = client.index('prompts');
  
  await index.updateSearchableAttributes(['title', 'content', 'description', 'tags']);
  await index.updateFilterableAttributes(['userId', 'folderId', 'isPublic', 'tags']);
  await index.updateSortableAttributes(['createdAt', 'updatedAt', 'usageCount']);
}
```

### 12.2 搜索功能

```typescript
async function advancedSearch(params: SearchParams) {
  const { userId, query, folderId, tags, page, limit } = params;
  
  const filters: string[] = [`userId = ${userId}`];
  if (folderId) filters.push(`folderId = ${folderId}`);
  if (tags?.length) filters.push(`tags IN [${tags.join(',')}]`);
  
  return client.index('prompts').search(query, {
    filter: filters.join(' AND '),
    limit: limit || 20,
    attributesToHighlight: ['title', 'content']
  });
}
```

---

## 13. AI 测试模块

### 13.1 Provider 接口

```typescript
export interface AIProvider {
  name: string;
  call(prompt: string, input: string, config: ModelConfig, apiKey: string): Promise<AIResponse>;
}

export interface AIResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; };
  model: string;
  finish_reason: string;
}
```

### 13.2 OpenAI Provider

```typescript
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  
  async call(prompt: string, input: string, config: ModelConfig, apiKey: string): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: input }
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 1000
      })
    });
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      finish_reason: data.choices[0].finish_reason
    };
  }
}
```

### 13.3 A/B 测试

```typescript
async function runABTest(promptA: Prompt, promptB: Prompt, inputText: string, config: ModelConfig) {
  const [resultA, resultB] = await Promise.all([
    provider.call(promptA.content, inputText, config, apiKey),
    provider.call(promptB.content, inputText, config, apiKey)
  ]);
  
  return {
    a: { prompt: promptA, output: resultA },
    b: { prompt: promptB, output: resultB },
    winner: resultA.content.length > resultB.content.length ? 'a' : 'b'
  };
}
```

---

## 14. 版本管理

### 14.1 版本策略

| 版本 | 保留数量 | 自动清理 |
|------|----------|----------|
| MVP | 10 | 是 |
| v1.0 | 20 | 是 |
| v1.1 | 无限制 | 手动 |

### 14.2 版本对比

```typescript
import { diffLines } from 'diff';

function compareVersions(oldContent: string, newContent: string) {
  return diffLines(oldContent, newContent);
}
```

---

## 15. 部署方案

### 15.1 Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: prompt_vault
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7

  meilisearch:
    image: getmeili/meilisearch:v1.4
    environment:
      MEILISEARCH_MASTER_KEY: masterKey

  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - meilisearch

volumes:
  postgres_data:
  meili_data:
```

### 15.2 Vercel 配置

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

---

## 16. 开发规范

### 16.1 代码规范

- TypeScript: 严格模式启用
- ESLint: 推荐配置 + Prettier
- Git Commit: conventional commits

### 16.2 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件 | kebab-case | prompt-list.tsx |
| 组件 | PascalCase | PromptList.tsx |
| Hooks | camelCase | usePrompts.ts |
| 数据库表 | snake_case | prompt_versions |
| API 路由 | kebab-case | /api/v1/prompt-versions |

---

## 17. 里程碑规划

### MVP (Week 1-2)

| 周 | 任务 |
|----|------|
| Week 1 D1-2 | 项目初始化 (Git, 骨架, Prisma) |
| Week 1 D3-4 | 用户认证 (注册/登录/JWT) |
| Week 1 D5 | Prompt CRUD |
| Week 2 D1-2 | 分类与标签 |
| Week 2 D3-4 | 搜索 (MeiliSearch) |
| Week 2 D5 | 内部测试 |

### Beta (Week 3-4)

| 周 | 任务 |
|----|------|
| Week 3 D1-2 | AI 测试功能 |
| Week 3 D3-4 | 版本历史 |
| Week 3 D5 | 导入导出 |
| Week 4 D1-2 | 性能优化 |
| Week 4 D3-4 | 移动端适配 |
| Week 4 D5 | 监控集成 |

### v1.0 (Week 5-6)

| 周 | 任务 |
|----|------|
| Week 5 D1-2 | 安全完善 (Rate Limiting, 加密) |
| Week 5 D3-4 | 用户引导 |
| Week 5 D5 | 文档 |
| Week 6 D1-2 | 公测上线 |
| Week 6 D3-4 | 反馈迭代 |
| Week 6 D5 | v1.0 正式发布 |

### v1.1 (Week 7-9)

| 周 | 任务 |
|----|------|
| Week 7 | 团队空间、权限管理 |
| Week 8 | 团队 Prompt、模板市场原型 |
| Week 9 | A/B 测试、效果评分系统 |

---

**文档结束**

*Lily 👩‍💻 - 技术文档已完成*
