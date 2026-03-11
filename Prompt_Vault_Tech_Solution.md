# Prompt Vault 技术方案文档

> **文档版本**: v1.0  
> **项目名称**: Prompt Vault  
> **状态**: 技术方案  
> **编写人**: Lily 👩‍💻  
> **日期**: 2026-03-11

---

## 1. 技术栈选型

### 1.1 技术栈总览

| 层级 | 推荐方案 | 备选方案 | 选择理由 |
|------|----------|----------|----------|
| **前端框架** | Next.js 14 (App Router) + React 18 | Vue 3 + Nuxt | SSR/SEO 支持好，生态丰富，与 Vercel 部署无缝集成 |
| **UI 组件库** | Shadcn/ui + Tailwind CSS | Ant Design | 高度可定制，轻量，符合 UX 设计的暗色主题需求 |
| **状态管理** | Zustand | Redux Toolkit | 轻量简洁，TypeScript 友好 |
| **后端框架** | NestJS (Node.js) | Go / Python FastAPI | 完善的模块化架构，TypeScript 全栈统一，生态成熟 |
| **数据库** | PostgreSQL (主) + Redis (缓存) | MySQL / MongoDB | JSON 支持好，复杂查询能力强，ACID 可靠 |
| **ORM** | Prisma | TypeORM | TypeScript 支持最好，迁移方便，类型安全 |
| **搜索引擎** | MeiliSearch | Elasticsearch | 开源轻量，搜索速度快，对中文支持好 |
| **文件存储** | 阿里云 OSS / AWS S3 | 自建 MinIO | 稳定可靠，成本低 |
| **认证方案** | NextAuth.js + JWT | Clerk | 开源可控，支持多Provider |
| **AI API 代理** | LangChain.js / Vercel AI SDK | 自建 | 统一接口，多模型支持 |
| **部署平台** | Vercel (前端) + Railway (后端) | Docker + K8s | 快速部署，自动扩展 |
| **监控** | Sentry (错误) + Mixpanel (埋点) | 自建 ELK | 接入简单，费用合理 |

### 1.2 技术选型理由详解

**前端：Next.js 14 + React**

- App Router 支持 Server Components，首屏加载快
- 与 Tailwind CSS 配合实现 UX 设计的暗色主题
- API Routes 简化前后端通信

**后端：NestJS**

- 模块化架构，便于团队协作和后续扩展
- TypeScript 与前端统一，减少类型转换
- 内置依赖注入，代码可测试性好

**数据库：PostgreSQL + Prisma**

- JSONB 类型存储 Prompt 的灵活字段（model_config 等）
- 全文搜索支持（配合 MeiliSearch）
- Prisma 提供类型安全的数据库操作

**搜索：MeiliSearch**

- 开源免费，自托管成本低
- 搜索响应 < 50ms，支持中文分词
- 易于与 PostgreSQL 同步

---

## 2. 系统架构设计

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
│                    (SSL Termination, Cache, WAF)                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       API Gateway (Next.js API Routes)                   │
│                 (Rate Limiting, Auth, Request Logging)                  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    Auth Module     │ │   Prompt Module    │ │   Test Module      │
│  (认证/鉴权/JWT)    │ │  (CRUD/版本/搜索)  │ │ (AI API 代理)      │
│                    │ │                    │ │                    │
│  - 注册/登录        │ │  - Prompt CRUD     │ │  - 模型调用        │
│  - Token 刷新      │ │  - 分类/标签管理    │ │  - 参数配置        │
│  - OAuth 第三方    │ │  - 版本历史        │ │  - 输出缓存        │
│  - 权限校验        │ │  - 全文搜索        │ │  - A/B 测试        │
└─────────┬───────────┘ └──────────┬──────────┘ └──────────┬──────────┘
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    PostgreSQL       │ │      Redis          │ │   External AI      │
│   (主数据库)        │ │   (缓存/会话/队列)   │ │   (OpenAI/Claude)  │
│                    │ │                      │ │                    │
│  - Users            │ │  - Session          │ │                    │
│  - Prompts          │ │  - API Response     │ │                    │
│  - Folders          │ │  - Rate Limit       │ │                    │
│  - Tags             │ │  - Search Cache     │ │                    │
│  - Versions         │ │                      │ │                    │
│  - Teams            │ │                      │ │                    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│    MeiliSearch      │
│   (搜索引擎)        │
│                    │
│  - Prompt 索引      │
│  - 全文检索        │
│  - 高亮显示        │
└─────────────────────┘
```

### 2.2 模块划分

| 模块 | 职责 | 核心技术 |
|------|------|----------|
| **Auth Module** | 用户认证、授权、Token 管理 | NextAuth.js, JWT, bcrypt |
| **Prompt Module** | Prompt 生命周期管理 | Prisma, MeiliSearch |
| **Version Module** | 版本控制与历史 | Prisma |
| **Test Module** | AI 模型调用、测试执行 | LangChain.js, Vercel AI SDK |
| **Folder Module** | 分类目录管理 | Prisma |
| **Tag Module** | 标签系统 | Prisma |
| **Team Module** | 团队协作、权限管理 (V1.1) | Prisma |
| **Template Module** | 模板市场 (V1.1) | Prisma, CDN |

### 2.3 组件关系

```
User
  ├── Prompt (1:N)
  │     ├── Folder (N:1)
  │     ├── Tag (N:M)
  │     └── Version (1:N)
  ├── Folder (1:N, self-reference)
  ├── Tag (1:N)
  ├── Team (N:M, as owner/member)
  └── ApiKey (1:N)

Team
  ├── Member (1:N)
  ├── Prompt (1:N)
  └── Template (1:N)
```

---

## 3. 数据模型设计

### 3.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    name            VARCHAR(100),
    avatar_url      VARCHAR(500),
    provider        VARCHAR(20) DEFAULT 'email',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- API Key 表
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(20) NOT NULL,
    api_key         VARCHAR(500) NOT NULL,
    api_secret      VARCHAR(500),
    is_default      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 文件夹表
CREATE TABLE folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    parent_id       UUID REFERENCES folders(id),
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 标签表
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    color           VARCHAR(7) DEFAULT '#58A6FF',
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Prompt 表 (核心)
CREATE TABLE prompts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    folder_id       UUID REFERENCES folders(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    content         TEXT NOT NULL,
    description     TEXT,
    model_config    JSONB DEFAULT '{}',
    is_public       BOOLEAN DEFAULT FALSE,
    is_favorite     BOOLEAN DEFAULT FALSE,
    is_pinned       BOOLEAN DEFAULT FALSE,
    usage_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Prompt-标签 多对多关联
CREATE TABLE prompt_tags (
    prompt_id       UUID REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id          UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_id, tag_id)
);

-- Prompt 版本历史
CREATE TABLE prompt_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id       UUID REFERENCES prompts(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    version_number  INTEGER NOT NULL,
    change_note     VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(prompt_id, version_number)
);

-- 测试记录
CREATE TABLE test_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id       UUID REFERENCES prompts(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    model_provider  VARCHAR(20) NOT NULL,
    model_name      VARCHAR(50) NOT NULL,
    input_text      TEXT NOT NULL,
    output_text     TEXT,
    model_config    JSONB,
    tokens_used     INTEGER,
    latency_ms      INTEGER,
    rating          INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 团队表 (V1.1)
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    owner_id        UUID REFERENCES users(id) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 团队成员
CREATE TABLE team_members (
    team_id         UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    joined_at       TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- 模板 (V1.1)
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    prompt_id       UUID REFERENCES prompts(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) NOT NULL,
    download_count  INTEGER DEFAULT 0,
    rating          DECIMAL(3,2) DEFAULT 0,
    is_official     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_prompts_user ON prompts(user_id);
CREATE INDEX idx_prompts_folder ON prompts(folder_id);
CREATE INDEX idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX idx_test_records_prompt ON test_records(prompt_id);
```

### 3.2 Prisma Schema 核心模型

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?
  name          String?
  avatarUrl     String?
  provider      String    @default("email")
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
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
  folder      Folder?  @relation(fields: [folderId], onDelete: SetNull)
  tags        Tag[]
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
```

---

## 4. API 接口设计

### 4.1 接口规范

- **Base URL**: `/api/v1`
- **认证**: Bearer Token (JWT)
- **Content-Type**: `application/json`

```json
// 成功响应
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100 }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "错误描述",
    "details": []
  }
}
```

### 4.2 核心接口列表

#### 认证模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/auth/register` | 邮箱注册 | ✗ |
| POST | `/auth/login` | 邮箱登录 | ✗ |
| POST | `/auth/oauth/:provider` | OAuth 第三方登录 | ✗ |
| POST | `/auth/refresh` | 刷新 Token | ✗ |
| POST | `/auth/logout` | 登出 | ✓ |
| GET | `/auth/me` | 获取当前用户信息 | ✓ |

#### 用户模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/users/me` | 获取当前用户资料 | ✓ |
| PATCH | `/users/me` | 更新用户资料 | ✓ |
| POST | `/users/me/api-keys` | 添加 API Key | ✓ |
| GET | `/users/me/api-keys` | 获取 API Key 列表 | ✓ |
| DELETE | `/users/me/api-keys/:id` | 删除 API Key | ✓ |

#### Prompt 模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/prompts` | 获取 Prompt 列表 | ✓ |
| GET | `/prompts/:id` | 获取单个 Prompt | ✓ |
| POST | `/prompts` | 创建 Prompt | ✓ |
| PATCH | `/prompts/:id` | 更新 Prompt | ✓ |
| DELETE | `/prompts/:id` | 删除 Prompt | ✓ |
| POST | `/prompts/:id/copy` | 复制 Prompt | ✓ |
| POST | `/prompts/:id/favorite` | 收藏/取消收藏 | ✓ |
| POST | `/prompts/:id/pin` | 置顶/取消置顶 | ✓ |
| GET | `/prompts/:id/versions` | 获取版本历史 | ✓ |
| POST | `/prompts/:id/versions` | 创建新版本 | ✓ |
| POST | `/prompts/:id/versions/:vid/restore` | 恢复版本 | ✓ |

#### 文件夹/标签模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/folders` | 获取文件夹树 | ✓ |
| POST | `/folders` | 创建文件夹 | ✓ |
| PATCH | `/folders/:id` | 更新文件夹 | ✓ |
| DELETE | `/folders/:id` | 删除文件夹 | ✓ |
| GET | `/tags` | 获取标签列表 | ✓ |
| POST | `/tags` | 创建标签 | ✓ |
| DELETE | `/tags/:id` | 删除标签 | ✓ |

#### 搜索模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/search` | 全文搜索 | ✓ |

#### 测试模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/test/run` | 运行单模型测试 | ✓ |
| POST | `/test/run-ab` | A/B 对比测试 | ✓ |
| GET | `/test/records` | 测试历史 | ✓ |
| POST | `/test/records/:id/rate` | 评分 | ✓ |

### 4.3 接口示例

**POST /api/v1/prompts - 创建 Prompt**

```json
// Request
{
  "title": "小红书种草文案",
  "content": "## 角色\n你是一位...",
  "description": "用于生成小红书风格的种草文案",
  "folderId": "uuid-optional",
  "tags": ["营销", "种草"],
  "modelConfig": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 1000
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "小红书种草文案",
    "content": "## 角色\n你是一位...",
    "folderId": "uuid-or-null",
    "tags": [{ "id": "uuid", "name": "营销", "color": "#58A6FF" }],
    "isFavorite": false,
    "isPinned": false,
    "usageCount": 0,
    "createdAt": "2026-03-11T10:00:00Z"
  }
}
```

---

## 5. 关键功能实现方案

### 5.1 Prompt 存储与 Markdown 编辑

**技术方案**:
- 使用 **react-markdown** + **remark-gfm** 渲染 Markdown
- 代码高亮: **Shiki** 
- 编辑器: **Monaco Editor**
- 实时预览: 左右分栏

**变量占位符检测**:
```typescript
const variableRegex = /\{\{([^}]+)\}\}/g;
const variables = content.match(variableRegex) || [];
```

### 5.2 全文搜索实现

**技术方案**:
- **MeiliSearch** 作为搜索索引
- PostgreSQL 作为主存储，每次变更时同步

**同步流程**:
```typescript
async function syncPromptToSearch(prompt: Prompt) {
  await meiliClient.index('prompts').addOrUpdateDocument({
    id: prompt.id,
    userId: prompt.userId,
    title: prompt.title,
    content: prompt.content,
    tags: prompt.tags.map(t => t.name),
    createdAt: prompt.createdAt.getTime()
  });
}
```

### 5.3 版本管理实现

**方案**:
- 每次保存创建新版本记录
- 版本号自增，保留 10 个版本
- 使用 **diff** 库对比差异

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

### 5.4 AI 测试调用实现

**方案**:
- **Vercel AI SDK** 统一接口
- 用户配置 API Key，服务端代理调用
- Redis 缓存减少重复调用

```typescript
async function runTest(prompt: Prompt, inputText: string, config: ModelConfig) {
  const apiKey = await getUserApiKey(prompt.userId, config.provider);
  const processedContent = replaceVariables(prompt.content, inputText);
  
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

## 6. 安全方案

### 6.1 认证与授权

**JWT 双 Token 方案**:
- **Access Token**: 15 分钟有效期
- **Refresh Token**: 7 天有效期，存 HttpOnly Cookie

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

### 6.2 数据加密

| 数据类型 | 加密方式 |
|----------|----------|
| 传输层 | TLS 1.3 |
| 密码 | bcrypt (12轮) |
| API Key | AES-256-GCM |

```typescript
import { createCipheriv, randomBytes } from 'crypto';

function encryptApiKey(plainText: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex') + cipher.final('hex');
  return iv.toString('hex') + ':' + cipher.getAuthTag().toString('hex') + ':' + encrypted;
}
```

### 6.3 权限控制

| 角色 | 权限 |
|------|------|
| Owner | 管理团队、删除、成员管理 |
| Admin | 成员管理、内容审核 |
| Member | 创建/编辑/删除团队 Prompt |
| Viewer | 仅查看和复制 |

### 6.4 API 安全

**Rate Limiting**:
- 登录: 5次/分钟
- 测试: 10次/分钟
- 通用: 100次/分钟

---

## 7. 性能优化策略

### 7.1 前端优化

| 策略 | 实现 | 收益 |
|------|------|------|
| 首屏渲染 | Next.js Server Components | FCP < 1s |
| 代码分割 | Dynamic Import | JS -40% |
| 缓存 | SWR / React Query | 请求 -90% |
| 虚拟列表 | react-window | 长列表流畅 |

### 7.2 后端优化

| 策略 | 收益 |
|------|------|
| 数据库索引 | 查询 10x |
| Redis 缓存 | 响应 5x |
| MeiliSearch | 搜索 < 50ms |
| 连接池 | 并发 3x |

### 7.3 AI 测试优化

- Redis 缓存相同输入 → 调用减少 30%
- 流式响应 (SSE) → 首字节 < 500ms

---

## 8. 开发里程碑拆分

### MVP (Week 1-2)

| 周 | 任务 |
|----|------|
| Week 1 D1-2 | 项目初始化 (Git, 骨架, Prisma) |
| Week 1 D3-4 | 用户认证 (注册/登录/JWT) |
| Week 1 D5 | Prompt CRUD |
| Week 2 D1-2 | 分类与标签 |
| Week 2 D3-4 | 搜索 (MeiliSearch) |
| Week 2 D5 | 内部测试 |

**验收**: 用户 3 分钟内完成注册并创建第一个 Prompt

### Beta (Week 3-4)

| 周 | 任务 |
|----|------|
| Week 3 D1-2 | AI 测试功能 |
| Week 3 D3-4 | 版本历史 |
| Week 3 D5 | 导入导出 |
| Week 4 D1-2 | 性能优化 |
| Week 4 D3-4 | 移动端适配 |
| Week 4 D5 | 监控集成 |

**验收**: 页面加载 < 2s，50+ 用户测试

### V1.0 (Week 5-6)

| 周 | 任务 |
|----|------|
| Week 5 D1-2 | 安全完善 (Rate Limiting, 加密) |
| Week 5 D3-4 | 用户引导 |
| Week 5 D5 | 文档 |
| Week 6 D1-2 | 公测上线 |
| Week 6 D3-4 | 反馈迭代 |
| Week 6 D5 | v1.0 正式发布 |

**验收**: 付费转化 > 5%, 月活 > 1000

### V1.1 (Week 7-9)

| 周 | 任务 |
|----|------|
| Week 7 | 团队空间、权限管理 |
| Week 8 | 团队 Prompt、模板市场原型 |
| Week 9 | A/B 测试、效果评分系统 |

---

**文档结束**

*Lily 👩‍💻 - 技术方案已完成，请查阅指正*
