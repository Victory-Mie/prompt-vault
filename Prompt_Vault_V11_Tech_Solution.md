# Prompt Vault V1.1 技术方案 - 模板市场与导入导出

> **文档版本**: v1.1  
> **项目名称**: Prompt Vault  
> **状态**: 技术方案  
> **编写人**: Lily 👩‍💻  
> **日期**: 2026-03-17

---

## 1. 技术架构设计

### 1.1 整体架构（扩展）

基于现有 V1.0 架构，V1.1 新增以下模块：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client (Web/Mobile)                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       API Gateway (Next.js API Routes)                   │
│         新增: /api/v1/templates*  /api/v1/import*  /api/v1/export*      │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   Template Module   │ │    Import/Export    │ │   Existing Modules  │
│      (新增)         │ │      (新增)          │ │   (Prompts/Folders) │
│                    │ │                      │ │                     │
│  - 模板 CRUD       │ │  - JSON 导入/导出    │ │                     │
│  - 分类管理        │ │  - 模板克隆          │ │                     │
│  - 官方模板初始化  │ │  - 变量替换          │ │                     │
│  - 评分系统        │ │                      │ │                     │
└─────────┬───────────┘ └──────────┬──────────┘ └─────────────────────┘
          │                        │
          ▼                        ▼
┌─────────────────────┐ ┌─────────────────────┐
│    PostgreSQL      │ │      Redis          │
│                    │ │                      │
│  + Template        │ │  - Template Cache   │
│  + TemplateCategory│ │  - Export Queue     │
│  + TemplateRating  │ │                      │
└─────────────────────┘ └─────────────────────┘
```

### 1.2 模块划分（扩展）

| 模块 | 职责 | 核心技术 |
|------|------|----------|
| **Template Module** | 模板市场核心功能 | Prisma, Redis Cache |
| **TemplateCategory Module** | 场景分类管理 | Prisma |
| **ImportExport Module** | 数据导入导出 | JSON Parser, Stream |
| **Existing Modules** | 复用现有模块 | - |

### 1.3 技术选型（扩展）

| 新增能力 | 技术方案 | 理由 |
|----------|----------|------|
| 模板缓存 | Redis | 热门模板高频访问，缓存减少 DB 压力 |
| 模板搜索 | 复用 MeiliSearch | 与 Prompt 搜索复用基础设施 |
| 模板评分 | PostgreSQL JSONB | 轻量级评分存储，无需额外服务 |
| 导入导出 | Node.js Stream | 大文件处理不阻塞 |
| 变量替换 | 正则表达式 | 简单可靠 |
| **Markdown 预览** | **react-markdown + remark-gfm** | **支持完整 Markdown 渲染 + GFM 表格/代码块** |

---

## 2. 数据库表结构

### 2.1 扩展现有表

**Template 表（已有基础，扩展字段）**

```prisma
// 扩展 Template 模型
model Template {
  id              String    @id @default(uuid())
  userId          String?
  teamId          String?
  promptId        String?
  title           String
  description     String?
  content         String    // 模板正文，包含 {{variable}} 占位符
  category        String    // 场景分类
  subCategory     String?   // 子分类
  tags            String[]  // 标签数组
  exampleInput    String?   // 示例输入
  exampleOutput   String?   // 示例输出
  variables       Json      // 变量定义: [{ name: "topic", type: "string", required: true, description: "..." }]
  applicableModels String[] // 适用模型: ["gpt-4o", "claude-3-opus"]
  downloadCount   Int       @default(0)
  rating          Decimal   @default(0)
  ratingCount     Int       @default(0)
  isOfficial      Boolean   @default(false)
  isFeatured      Boolean   @default(false)
  status          String    @default("draft") // draft, published, archived
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  team            Team?     @relation(fields: [teamId], references: [id], onDelete: SetNull)
  prompt          Prompt?   @relation(fields: [promptId], references: [id], onDelete: SetNull)
  ratings         TemplateRating[]
  categories      TemplateCategory? @relation(fields: [category], references: [slug])

  @@index([userId])
  @@index([teamId])
  @@index([category])
  @@index([status])
  @@index([isOfficial])
}

// 新增：模板评分
model TemplateRating {
  id          String   @id @default(uuid())
  templateId  String
  userId      String
  rating      Int      // 1-5
  createdAt   DateTime @default(now())

  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, userId]) // 每个用户只能评分一次
  @@index([templateId])
}

// 新增：模板分类
model TemplateCategory {
  id          String   @id @default(uuid())
  name        String   // 分类名称: "写作", "编程"
  slug        String   @unique // URL slug: "writing", "coding"
  description String?
  icon        String?  // 图标名称
  sortOrder   Int      @default(0)
  parentId    String?
  templates   Template[]

  parent      TemplateCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    TemplateCategory[] @relation("CategoryHierarchy")

  @@index([parentId])
}
```

### 2.2 SQL 迁移脚本

```sql
-- 扩展 templates 表
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS example_input TEXT,
ADD COLUMN IF NOT EXISTS example_output TEXT,
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS applicable_models TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- 创建模板分类表
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    parent_id UUID REFERENCES template_categories(id)
);

-- 创建模板评分表
CREATE TABLE IF NOT EXISTS template_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, user_id)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_is_featured ON templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template ON template_ratings(template_id);
```

### 2.3 官方模板初始数据

```typescript
// seed-data/templates.ts
export const officialTemplates = [
  {
    category: 'writing',
    title: '小红书种草文案',
    description: '生成小红书风格的种草文案',
    content: `你是一位资深小红书文案专家。请根据以下信息生成一篇种草文案：

主题：{{topic}}
产品亮点：{{highlights}}
目标受众：{{target_audience}}
字数要求：{{word_count}}

要求：
1. 语言生动有趣，符合小红书风格
2. 使用 emoji 增加趣味性
3. 适当加入热门标签
4. 结尾引导互动`,
    exampleInput: 'topic: 蓝牙耳机\nhighlights: 降噪、音质好、续航长\ntarget_audience: 年轻上班族\nword_count: 300',
    exampleOutput: '🎧 今天必须给你们安利这款蓝牙耳机！\n\n✨ 入手一个月了，真的爱不释手...\n\n#蓝牙耳机 #数码好物 #降噪',
    variables: [
      { name: 'topic', type: 'string', required: true, description: '推广主题/产品' },
      { name: 'highlights', type: 'string', required: true, description: '产品亮点，用逗号分隔' },
      { name: 'target_audience', type: 'string', required: false, description: '目标受众' },
      { name: 'word_count', type: 'number', required: false, description: '字数要求', default: '300' }
    ],
    applicableModels: ['gpt-4o', 'claude-3-sonnet'],
    isOfficial: true,
    status: 'published'
  },
  // ... 更多模板（目标 30-40 个）
];
```

---

## 3. API 接口设计

### 3.1 模板市场接口

#### 分类模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/v1/template-categories` | 获取分类列表（含模板数） | ✗ |
| GET | `/api/v1/template-categories/:slug` | 获取分类详情 | ✗ |

#### 模板模块

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/v1/templates` | 获取模板列表（支持筛选排序） | ✗ |
| GET | `/api/v1/templates/:id` | 获取模板详情 | ✗ |
| POST | `/api/v1/templates` | 创建模板 | ✓ |
| PATCH | `/api/v1/templates/:id` | 更新模板 | ✓ (Owner) |
| DELETE | `/api/v1/templates/:id` | 删除模板 | ✓ (Owner) |
| POST | `/api/v1/templates/:id/rate` | 评分 | ✓ |
| POST | `/api/v1/templates/:id/clone` | 克隆到我的 Prompts | ✓ |

#### 筛选参数

```
GET /api/v1/templates?category=writing&sort=popular&page=1&limit=20&q=小红书

参数说明：
- category: 分类 slug
- sort: popular(热门) | newest(最新) | rating(评分)
- page: 页码
- limit: 每页数量
- q: 搜索关键词
- tags: 标签（逗号分隔）
- models: 适用模型（逗号分隔）
```

### 3.2 导入/导出接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/v1/export` | 导出全部数据 | ✓ |
| GET | `/api/v1/export/prompts/:id` | 导出单个 Prompt | ✓ |
| POST | `/api/v1/import` | 导入 JSON | ✓ |
| POST | `/api/v1/import/validate` | 预验证导入文件 | ✓ |

### 3.3 接口详细定义

#### GET /api/v1/templates - 获取模板列表

```typescript
// Query Parameters
interface TemplateListQuery {
  category?: string;      // 分类 slug
  sort?: 'popular' | 'newest' | 'rating';
  page?: number;
  limit?: number;
  q?: string;            // 搜索关键词
  tags?: string;         // 标签筛选
  models?: string;       // 适用模型筛选
  isOfficial?: boolean;  // 仅官方模板
}

// Response
interface TemplateListResponse {
  success: boolean;
  data: {
    items: TemplateCard[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface TemplateCard {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  downloadCount: number;
  isOfficial: boolean;
  applicableModels: string[];
  createdAt: string;
}
```

#### GET /api/v1/templates/:id - 获取模板详情

```typescript
// Response
interface TemplateDetailResponse {
  success: boolean;
  data: TemplateDetail;
}

interface TemplateDetail {
  id: string;
  title: string;
  description: string;
  content: string;           // 模板正文（含变量占位符）
  category: string;
  subCategory?: string;
  tags: string[];
  exampleInput: string;
  exampleOutput: string;
  variables: VariableDef[];
  applicableModels: string[];
  rating: number;
  ratingCount: number;
  downloadCount: number;
  isOfficial: boolean;
  isFeatured: boolean;
  creator: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface VariableDef {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  description: string;
  default?: string;
  options?: string[];  // for select type
}
```

#### POST /api/v1/templates/:id/clone - 克隆模板

```typescript
// Request
interface CloneTemplateRequest {
  folderId?: string;     // 可选：指定保存到哪个文件夹
  title?: string;        // 可选：自定义标题
  variables: Record<string, string>;  // 变量填写
}

// Response
interface CloneTemplateResponse {
  success: boolean;
  data: {
    promptId: string;    // 创建的 Prompt ID
    previewUrl: string;  // 预览 URL
  };
}
```

#### GET /api/v1/export - 导出数据

```typescript
// Query Parameters
interface ExportQuery {
  format?: 'json';       // 目前仅支持 JSON
  include?: string;      // 导出内容: prompts,folders,tags,all (default: all)
  promptIds?: string;    // 指定导出的 prompt IDs（逗号分隔）
}

// Response (Stream)
interface ExportData {
  version: '1.0';
  exportedAt: string;
  user: {
    id: string;
    name: string;
  };
  data: {
    prompts: PromptExport[];
    folders: FolderExport[];
    tags: TagExport[];
  };
}

interface PromptExport {
  id: string;
  title: string;
  content: string;
  description?: string;
  folderId?: string;
  tags: string[];
  modelConfig: object;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/v1/import - 导入数据

```typescript
// Request (multipart/form-data)
interface ImportRequest {
  file: File;           // JSON 文件
  mode?: 'merge' | 'replace';  // merge: 合并到现有数据, replace: 替换
}

// Response
interface ImportResponse {
  success: boolean;
  data: {
    imported: {
      prompts: number;
      folders: number;
      tags: number;
    };
    errors: ImportError[];
    warnings: ImportWarning[];
  };
}

interface ImportError {
  type: 'invalid_format' | 'missing_field' | 'duplicate_id';
  message: string;
  line?: number;
}

interface ImportWarning {
  type: 'folder_not_found' | 'tag_not_found';
  message: string;
  fix?: string;  // 建议的修复方式
}
```

---

## 4. 前端页面结构

### 4.1 页面路由

```
/templates                    # 模板市场首页
├── /templates                # 全部模板
├── /templates/[category]     # 分类页面
├── /templates/[category]/[id] # 模板详情
└── /templates/create         # 创建模板（用户贡献）

/settings/import              # 导入页面
└── /settings/export          # 导出页面
```

### 4.2 模板市场首页

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ [搜索框]                    [官方精选] [全部] [写作] [编程]... │
├─────────────────────────────────────────────────────────────┤
│ Hero Banner (Featured Templates)                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ 精选模板1   │ │ 精选模板2   │ │ 精选模板3   │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ 分类导航                                                     │
│ [写作] [编程] [客服] [营销] [教育] [数据分析] [+更多]        │
├─────────────────────────────────────────────────────────────┤
│ 模板列表                                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │ 模板卡片 │ │ 模板卡片 │ │ 模板卡片 │ │ 模板卡片 │         │
│ │ ⭐4.8    │ │ ⭐4.5    │ │ ⭐4.9    │ │ ⭐4.2    │         │
│ │ 📥 1.2k  │ │ 📥 890   │ │ 📥 2.1k  │ │ 📥 456   │         │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                             │
│ [排序: 热门 ▼] [筛选: 适用模型 ▼]                             │
├─────────────────────────────────────────────────────────────┤
│ 分页                                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 模板详情页

```
┌─────────────────────────────────────────────────────────────┐
│ [< 返回]                                        [分享] [举报] │
├─────────────────────────────────────────────────────────────┤
│ 模板标题                                        [官方] ⭐4.8  │
│ 分类: 写作 > 文案创作                        📥 1,234 次使用 │
├─────────────────────────────────────────────────────────────┤
│ 标签: [种草] [小红书] [营销]                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 模板预览                 │ │ 变量填写                     │ │
│ │                         │ │                             │ │
│ │ {{topic}}               │ │ topic * [________________]  │ │
│ │ {{highlights}}          │ │                             │ │
│ │                         │ │ highlights * [____________] │ │
│ │                         │ │                             │ │
│ │                         │ │ target_audience [_________] │ │
│ │                         │ │                             │ │
│ │                         │ │ word_count [300]            │ │
│ │                         │ │                             │ │
│ │                         │ │ [预览效果]                   │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 示例                                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 输入:                                                   │ │
│ │ topic: 蓝牙耳机                                         │ │
│ │ ...                                                    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 输出:                                                   │ │
│ │ 🎧 今天必须给你们安利这款蓝牙耳机！...                  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 适用模型: [GPT-4o] [Claude-3]                                 │
├─────────────────────────────────────────────────────────────┤
│                    [立即克隆]  [直接测试]                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 导入/导出页面

```
┌─────────────────────────────────────────────────────────────┐
│ 导入/导出设置                                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │        导入             │ │         导出                │ │
│ │                         │ │                             │ │
│ │  [选择文件]             │ │  [导出全部]  [导出选中]     │ │
│ │                         │ │                             │ │
│ │  支持格式: JSON         │ │  导出内容:                   │ │
│ │                         │ │  ☑ Prompts                  │ │
│ │  导入模式:               │ │  ☑ Folders                  │ │
│ │  ○ 合并到现有           │ │  ☑ Tags                     │ │
│ │  ○ 替换现有             │ │                             │ │
│ │                         │ │  格式: JSON                 │ │
│ │  [预览] [开始导入]      │ │                             │ │
│ │                         │ │  [开始导出]                 │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 导入历史                                                     │
│ │ 2026-03-17 14:30 │ 导入 12 个 Prompts │ ✅ 成功          │ │
│ │ 2026-03-15 10:20 │ 导入 5 个 Prompts  │ ⚠️ 部分成功      │ │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 核心组件设计

| 组件 | 路径 | 职责 |
|------|------|------|
| `TemplateCard` | `components/templates/TemplateCard.tsx` | 模板卡片展示 |
| `TemplateGrid` | `components/templates/TemplateGrid.tsx` | 模板网格布局 |
| `TemplateFilter` | `components/templates/TemplateFilter.tsx` | 筛选/排序控件 |
| `VariableForm` | `components/templates/VariableForm.tsx` | 变量填写表单 |
| `TemplatePreview` | `components/templates/TemplatePreview.tsx` | 模板预览（含变量替换） |
| `CategoryNav` | `components/templates/CategoryNav.tsx` | 分类导航 |
| `ExportPanel` | `components/settings/ExportPanel.tsx` | 导出功能 |
| `ImportPanel` | `components/settings/ImportPanel.tsx` | 导入功能 |

---

## 5. 关键实现难点与解决方案

### 5.1 变量占位符解析与替换

**难点**：解析模板中的 `{{variable}}` 占位符，并生成对应的填写表单

**解决方案**：

```typescript
// 1. 提取变量
const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

function extractVariables(content: string): VariableDef[] {
  const matches = [...content.matchAll(VARIABLE_REGEX)];
  const seen = new Set<string>();
  
  return matches.map(match => {
    const name = match[1].trim();
    if (seen.has(name)) return null;
    seen.add(name);
    
    return {
      name,
      type: 'string', // 默认类型
      required: true,
      description: '',
    };
  }).filter(Boolean);
}

// 2. 变量替换
function replaceVariables(content: string, values: Record<string, string>): string {
  return content.replace(VARIABLE_REGEX, (_, name) => {
    return values[name.trim()] || `{{${name}}}`;
  });
}

// 3. 实时预览
function LivePreview({ content, variables }: { content: string, variables: Record<string, string> }) {
  const rendered = useMemo(() => replaceVariables(content, variables), [content, variables]);
  return <MarkdownRenderer content={rendered} />;
}
```

### 5.2 模板评分系统

**难点**：防止刷分、计算加权平均

**解决方案**：

```typescript
// 评分服务
class TemplateRatingService {
  async rate(templateId: string, userId: string, rating: number): Promise<void> {
    // 1. 验证评分有效性
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // 2. 记录或更新评分
    const existing = await prisma.templateRating.findUnique({
      where: { templateId_userId: { templateId, userId } }
    });
    
    if (existing) {
      await prisma.templateRating.update({
        where: { id: existing.id },
        data: { rating }
      });
    } else {
      await prisma.templateRating.create({
        data: { templateId, userId, rating }
      });
    }
    
    // 3. 重新计算模板平均分
    await this.updateTemplateRating(templateId);
  }
  
  private async updateTemplateRating(templateId: string): Promise<void> {
    const agg = await prisma.templateRating.aggregate({
      where: { templateId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    
    await prisma.template.update({
      where: { id: templateId },
      data: {
        rating: agg._avg.rating || 0,
        ratingCount: agg._count.rating
      }
    });
  }
}
```

### 5.3 大文件导入导出

**难点**：大量 Prompts 导出可能超时，导入需要校验

**解决方案**：

```typescript
// 1. 流式导出
async function exportPrompts(userId: string, res: Response): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=prompt-vault-export-${Date.now()}.json`);
  
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(JSON.stringify({ version: '1.0', exportedAt: new Date().toISOString(), data: { prompts: [] }));
      
      const cursor = prisma.prompt.findMany({ where: { userId } }).cursor();
      
      for await (const prompt of cursor) {
        controller.enqueue(JSON.stringify(prompt));
      }
      
      controller.close();
    }
  });
  
  // 使用 streaming 响应
  return new Response(stream);
}

// 2. 分块导入 + 事务
async function importPrompts(userId: string, prompts: PromptExport[], mode: 'merge' | 'replace'): Promise<ImportResult> {
  const result: ImportResult = { imported: { prompts: 0 }, errors: [] };
  
  // 事务保证数据一致性
  await prisma.$transaction(async (tx) => {
    if (mode === 'replace') {
      // 删除现有数据（可选，谨慎操作）
      await tx.prompt.deleteMany({ where: { userId } });
    }
    
    for (const prompt of prompts) {
      try {
        await tx.prompt.create({
          data: {
            userId,
            title: prompt.title,
            content: prompt.content,
            description: prompt.description,
            // ...
          }
        });
        result.imported.prompts++;
      } catch (error) {
        result.errors.push({
          type: 'invalid_format',
          message: `Failed to import prompt: ${prompt.title}`,
        });
      }
    }
  });
  
  return result;
}
```

### 5.4 模板搜索（复用 MeiliSearch）

**难点**：模板需要单独索引还是复用 Prompt 索引

**解决方案**：

```typescript
// 模板搜索服务
class TemplateSearchService {
  private meiliClient: MeiliSearch;
  
  async syncTemplateToSearch(template: Template): Promise<void> {
    await this.meiliClient.index('templates').addOrUpdateDocument({
      id: template.id,
      title: template.title,
      description: template.description,
      content: template.content,
      category: template.category,
      tags: template.tags,
      isOfficial: template.isOfficial,
      downloadCount: template.downloadCount,
      rating: template.rating,
      createdAt: template.createdAt.getTime()
    });
  }
  
  async search(query: string, filters?: SearchFilters): Promise<SearchResult> {
    const filterExpressions = [];
    
    if (filters?.category) {
      filterExpressions.push(`category = "${filters.category}"`);
    }
    if (filters?.isOfficial !== undefined) {
      filterExpressions.push(`isOfficial = ${filters.isOfficial}`);
    }
    
    return this.meiliClient.index('templates').search(query, {
      filter: filterExpressions.join(' AND '),
      sort: [`downloadCount:desc`, `rating:desc`]
    });
  }
}
```

---

## 6. 预计开发时间

### 6.1 里程碑拆分

| 阶段 | 周 | 任务 | 预估工时 |
|------|-----|------|----------|
| **Week 1** | 1 | 数据库迁移 + 分类初始化 | 8h |
| | | 模板 CRUD 基础 API | 16h |
| | | 模板列表/详情页面 | 12h |
| **Week 2** | 2 | 变量表单组件 | 8h |
| | | 模板克隆功能 | 8h |
| | | 模板搜索（MeiliSearch） | 8h |
| | | 官方模板填充（30个） | 12h |
| **Week 3** | 3 | 评分系统 | 8h |
| | | 导入功能 | 12h |
| | | 导出功能 | 12h |
| **Week 4** | 4 | 内部测试 + Bug 修复 | 16h |
| | | 性能优化 | 8h |
| | | 上线部署 | 8h |

### 6.2 工时汇总

| 模块 | 预估工时 |
|------|----------|
| 后端 API | 40h |
| 前端页面 | 40h |
| 导入/导出 | 24h |
| 官方模板 | 12h |
| 测试/优化 | 24h |
| **总计** | **140h** |

### 6.3 MVP 范围精简

为确保快速上线，MVP 阶段可精简：

| 功能 | MVP | 后续 |
|------|-----|------|
| 模板分类 | 6 个主要分类 | 全部分类 |
| 模板数量 | 30 个官方模板 | 社区贡献 |
| 评分系统 | 1-5 星 | + 评价内容 |
| 模板搜索 | 基础搜索 | 高级筛选 |
| 导入格式 | JSON | + Markdown |
| 导出范围 | 全部导出 | 按文件夹/标签 |

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 变量解析复杂度 | 中 | MVP 简化为字符串类型，后续扩展 |
| 导入文件格式多样 | 高 | MVP 仅支持标准 JSON，预留扩展口 |
| 模板质量参差 | 中 | 官方模板严格审核，社区模板需审批 |
| 搜索性能 | 低 | 复用现有 MeiliSearch 基础设施 |

---

**文档结束**

*Lily 👩‍💻 - V1.1 技术方案已完成，请查阅指正*
