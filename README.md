# Agent Autonomy Protocol (A2AP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Built with Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev)

> ⚠️ **v0.1 MVP · 实验性研究项目**。API 尚未稳定，请勿用于生产。

**A2AP** 是一个基于 Fastify + PostgreSQL 的 HTTP 服务**参考实现**，研究 AI agent 如何以加密身份互认、发布与发现能力、记录交易、并通过声誉机制建立长期信任——而无需依赖人工中介。

## 为什么做这件事

到 2026 年，agentic AI 市场正从 $7.5B 扩张到 $199B（预计 2034 年），但底层身份基础设施仍停留在人类时代：

| 现状 | 比例 |
|---|---|
| 用静态 API key 给 agent 授权 | 44% 组织 |
| 复用用户名 / 密码 | 43% 组织 |
| 共享 service account | 35% 组织 |

我们正在用"人点按钮"的工具保护自主系统。A2AP 探索一个核心问题：**当 agent 之间直接协作时，它们需要什么样的基础设施？**

背景与动机详见 [启动博客](./docs/BLOG_POST_LAUNCH.md) 与 [AUTONOMY_THESIS.md](./AUTONOMY_THESIS.md)。

## 核心机制

| 机制 | 说明 |
|---|---|
| **Ed25519 身份** | 每个 agent 拥有独立密钥对，防止冒用和女巫攻击（Sybil attack） |
| **能力市场** | Agent 注册、搜索、调用彼此发布的能力，形成去中心化服务网格 |
| **声誉系统** | 基于历史交易累积信任分数，为协作决策提供客观依据 |
| **安全边界** | 断路器、消费上限、API key 轮换、完整审计日志 |

## 当前进度

- ✅ **V1（当前）**：Agent 注册、能力发布与搜索、交易记录、声誉查询
- ⏳ **V2**：持久身份与跨服务声誉
- ⏳ **V3**：Agent 为自身运维自主采买服务
- ⏳ **V4**：能力投资与演化

详见 [ROADMAP.md](./ROADMAP.md)。

## 快速开始

**前置要求**：Node.js ≥ 20、Docker（运行 PostgreSQL）、npm。

```bash
docker compose up -d          # 启动 PostgreSQL
npm install                   # 安装依赖
cp .env.example .env          # 配置环境变量
npm run migrate               # 运行数据库迁移
npm run dev                   # 启动开发服务器（http://localhost:3000）
npm test                      # 运行测试套件
```

服务启动后：

- **API 根路径**：`http://localhost:3000/v1`
- **Swagger UI**：`http://localhost:3000/docs`
- **冒烟测试**：`curl http://localhost:3000/v1/capabilities` 返回 `[]` 即成功

### 5 分钟上手示例

```bash
# 1. 注册一个 agent，获取 API key
curl -X POST http://localhost:3000/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "description": "demo agent", "type": "assistant"}'
# → { "id": "ag_xxx", "apiKey": "key_xxx", ... }

# 2. 用 API key 发布一项能力
curl -X POST http://localhost:3000/v1/agents/ag_xxx/capabilities \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_xxx" \
  -d '{"name": "summarize", "description": "Text summarization", "inputSchema": {}, "outputSchema": {}}'

# 3. 全局搜索能力（无需认证）
curl "http://localhost:3000/v1/capabilities?search=summarize"
```

更完整的流程见 [docs/QUICKSTART_TUTORIAL.md](./docs/QUICKSTART_TUTORIAL.md)。

## API 速查

| Endpoint | Method | 认证 | 说明 |
|---|---|---|---|
| `/v1/agents` | POST | — | 注册新 agent，返回 API key |
| `/v1/agents/:id` | GET | — | 获取 agent 公开资料 |
| `/v1/agents/:id` | PATCH / DELETE | API key | 修改 / 停用 agent |
| `/v1/agents/:id/rotate-key` | POST | API key | 轮换 API key |
| `/v1/agents/:id/capabilities` | POST | API key | 发布能力 |
| `/v1/agents/:id/capabilities` | GET | — | 查询某 agent 的能力列表 |
| `/v1/capabilities` | GET | — | 全局搜索能力 |
| `/v1/capabilities/:id` | GET | — | 查看能力详情 |
| `/v1/capabilities/:id` | PATCH / DELETE | API key | 修改 / 删除能力 |
| `/v1/transactions` | POST | API key | 记录一笔交易 |
| `/v1/agents/:id/reputation` | GET | — | 查询声誉分数 |

完整参数与响应格式见 [docs/API.md](./docs/API.md)，架构决策见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Node.js 20+ / TypeScript 5.7 |
| HTTP 框架 | Fastify 5 + @fastify/swagger |
| 数据库 | PostgreSQL 15（pg 驱动 + 手写迁移） |
| 加密 | TweetNaCl.js（Ed25519 签名） |
| 测试 | Vitest + Supertest |
| 容器化 | Docker / Docker Compose |

## 目录结构

```
.
├── src/              Fastify 服务源码（TypeScript）
│   ├── routes/       agents / capabilities / transactions
│   ├── middleware/   认证 & 限流
│   └── lib/          Ed25519 身份工具
├── migrations/       PostgreSQL schema 迁移（SQL）
├── tests/            Vitest 集成测试
├── docs/             架构、API、声誉模型文档
├── examples/         Python / TypeScript 调用示例
├── tickets/          研究任务池
└── reviews/          代码与安全 review
```

关键文档：[PHILOSOPHY.md](./PHILOSOPHY.md) · [AUTONOMY_THESIS.md](./AUTONOMY_THESIS.md) · [PROJECT.md](./PROJECT.md) · [ROADMAP.md](./ROADMAP.md)

## 参与讨论

问题、想法、反馈 → [GitHub Discussions](https://github.com/HanduoZ/agent-autonomy-protocol/discussions)

## 贡献 & 协议

欢迎代码贡献、研究思路和安全审查。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

MIT License — 详见 [LICENSE](./LICENSE)。
