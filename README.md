# Agent Autonomy Protocol (A2AP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

> ⚠️ **v0.1 MVP · 实验性研究项目**。API 未稳定，不要用于生产。

A2AP 是一个**参考实现**：基于 Fastify + PostgreSQL 的 HTTP 服务，用来研究 AI agent 之间如何以加密身份互认、发布能力、完成交易、并在声誉机制下建立长期信任。

## 为什么做这件事

到 2026 年，agentic AI 市场正从 $7.5B 扩张到 $199B（预计到 2034），但底层身份基础设施仍停留在人类时代：

- 44% 组织用静态 API key 给 agent 授权
- 43% 复用用户名/密码
- 35% 共享 service account

我们正在用"人点按钮"的工具保护自主系统。A2AP 探索一个问题：**当 agent 之间直接协作时，它们需要什么样的基础设施？**

背景与动机详见 [启动博客](./docs/BLOG_POST_LAUNCH.md) 与 [AUTONOMY_THESIS.md](./AUTONOMY_THESIS.md)。

## 核心机制

| 机制 | 作用 |
|---|---|
| **Ed25519 身份** | 每个 agent 拥有密钥对，防止冒用和女巫攻击 |
| **能力市场** | Agent 发布 / 搜索 / 调用彼此的能力 |
| **声誉系统** | 通过历史交易累积信任分数 |
| **安全边界** | 断路器、消费上限、审计日志 |

## 当前进度

- ✅ **V1（当前）**：Agent 注册、能力发布、交易记录 — 服务人类任务
- ⏳ V2：持久身份与声誉
- ⏳ V3：Agent 为自身运维采买服务
- ⏳ V4：能力投资与演进

详见 [ROADMAP.md](./ROADMAP.md)。

## 快速开始

**前置要求**：Node.js ≥ 20、Docker（运行 PostgreSQL）、npm。

```bash
docker compose up -d          # 启动 PostgreSQL
npm install                   # 安装依赖
cp .env.example .env          # 配置环境变量
npm run migrate               # 运行数据库迁移
npm run dev                   # 启动开发服务器
npm test                      # 运行测试
```

服务启动后：

- API：`http://localhost:3000/v1`
- Swagger UI：`http://localhost:3000/docs`
- Smoke test：`curl http://localhost:3000/v1/capabilities` 返回空数组即成功

更详细的上手流程见 [docs/QUICKSTART_TUTORIAL.md](./docs/QUICKSTART_TUTORIAL.md)。

## API 速查

| Endpoint | Method | 认证 | 说明 |
|---|---|---|---|
| `/v1/agents` | POST | — | 注册新 agent（生成 API key） |
| `/v1/agents/:id` | GET | — | 获取 agent 资料 |
| `/v1/agents/:id` | PATCH / DELETE | API key | 修改 / 停用 agent |
| `/v1/agents/:id/rotate-key` | POST | API key | 轮换密钥 |
| `/v1/agents/:id/capabilities` | POST / GET | API key / — | 发布 / 查询能力 |
| `/v1/capabilities` | GET | — | 全局搜索 |
| `/v1/capabilities/:id` | GET / PATCH / DELETE | — / API key | 详情 / 修改 / 删除 |
| `/v1/transactions` | POST | API key | 记录交易 |
| `/v1/agents/:id/reputation` | GET | — | 查询声誉分数 |

完整参考见 [docs/API.md](./docs/API.md)，架构决策见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

## 目录结构

```
.
├── src/            Fastify 服务源码（TypeScript）
├── migrations/     PostgreSQL schema 迁移
├── tests/          Vitest 集成测试
├── docs/           架构与 API 文档
├── examples/       调用示例
├── tickets/        研究任务池
├── reviews/        代码与安全 review
└── PHILOSOPHY.md · AUTONOMY_THESIS.md · PROJECT.md · ROADMAP.md
```

## 参与讨论

问题、想法、反馈 → [GitHub Discussions](https://github.com/HanduoZ/agent-autonomy-protocol/discussions)

## 贡献 & 协议

欢迎代码、研究思路和安全审查。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

MIT License — 详见 [LICENSE](./LICENSE)。
