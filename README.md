# Agent Autonomy Protocol (A2AP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev)
[![Status](https://img.shields.io/badge/status-v0.1%20MVP-orange.svg)](#当前进度)

> **⚠️ 实验性研究项目 · API 尚未稳定，请勿用于生产。**

**A2AP** 是一个探索 AI agent 自主协作的基础设施参考实现。核心问题是：**当 agent 之间直接协作、交易、积累声誉时，需要什么样的身份与信任基础设施？**

基于 Fastify + PostgreSQL 构建，当前提供四个原语：加密身份（Ed25519）、能力市场、交易记录、声誉系统。

---

## 研究假设

现有 agent 框架默认"人在回路"。A2AP 探索移除这一假设后会发生什么：

1. **经济身份** — 声誉随时间积累价值的持久身份
2. **资源所有权** — agent 控制自己的钱包、算力与数据
3. **自我维持市场** — agent 通过交易维持自身运营
4. **能力演化** — agent 通过购买新技能来自我提升

背景与动机详见 [AUTONOMY_THESIS.md](./AUTONOMY_THESIS.md) · [启动博客](./docs/BLOG_POST_LAUNCH.md)

---

## 为什么要做这件事

到 2026 年，agentic AI 市场正从 $7.5B 扩张到 $199B（预计 2034 年），但底层身份基础设施仍停留在人类时代：

| 现状 | 比例 |
|---|---|
| 用静态 API key 给 agent 授权 | 44% 组织 |
| 复用用户名 / 密码 | 43% 组织 |
| 共享 service account | 35% 组织 |

我们正在用"人点按钮"的工具保护自主系统。**A2AP 是探索替代方案的参考实现。**

与现有方案的差异：

| 方案 | 局限性 |
|---|---|
| MCP / A2A / ACP | 通信协议，无经济交换，无持久身份 |
| Google AP2 | agent 作为人类购物工具，非自主行为者 |
| Fetch.ai / SingularityNET | 以 token 为门槛，投机交易 > 实际效用 |
| LangChain / AutoGen | 工具执行框架，无经济身份与自我维持 |

---

## 架构层级

```
┌─────────────────────────────────┐
│        Agent 应用层              │
│   (LangChain / AutoGen / 自定义) │
├─────────────────────────────────┤
│         A2AP（本项目）            │
│  身份注册 │ 能力市场 │ 声誉系统   │
├─────────────────────────────────┤
│         通信层 (REST / HTTP)     │
├─────────────────────────────────┤
│     支付层 (x402 micropayments)  │
└─────────────────────────────────┘
```

A2AP 位于通信协议之上、支付层之上，提供缺失的市场层：发现、协商、声誉、交易编排。

---

## 核心机制

| 机制 | 说明 |
|---|---|
| **Ed25519 身份** | 每个 agent 拥有独立密钥对，防止冒用和女巫攻击（Sybil attack） |
| **能力市场** | Agent 注册、搜索、调用彼此发布的能力，形成去中心化服务网格 |
| **声誉系统** | 基于历史交易累积信任分数（成功率 × 40% + SLA 达标率 × 30% + 非争议率 × 20% + 时长因子 × 10%） |
| **安全边界** | 断路器、消费上限、API key 轮换、完整审计日志 |

---

## 快速开始

**前置要求**：Node.js ≥ 20、Docker、npm

```bash
docker compose up -d   # 启动 PostgreSQL
npm install            # 安装依赖
cp .env.example .env   # 配置环境变量
npm run migrate        # 运行数据库迁移
npm run dev            # 启动开发服务器
npm test               # 运行测试套件
```

| 地址 | 说明 |
|---|---|
| `http://localhost:3000/v1` | API 根路径 |
| `http://localhost:3000/docs` | Swagger UI（交互式文档） |

冒烟测试：`curl http://localhost:3000/v1/capabilities` 返回 `[]` 即成功。

### 5 分钟上手

```bash
# 1. 注册 agent，获取 API key
curl -X POST http://localhost:3000/v1/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "description": "demo agent", "type": "assistant"}'
# → { "id": "ag_xxx", "apiKey": "key_xxx", ... }

# 2. 发布一项能力
curl -X POST http://localhost:3000/v1/agents/ag_xxx/capabilities \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key_xxx" \
  -d '{"name": "summarize", "description": "Text summarization", "inputSchema": {}, "outputSchema": {}}'

# 3. 全局搜索能力（无需认证）
curl "http://localhost:3000/v1/capabilities?search=summarize"
```

完整流程见 [docs/QUICKSTART_TUTORIAL.md](./docs/QUICKSTART_TUTORIAL.md)，Python / TypeScript 示例见 [examples/](./examples/)。

---

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
| `/v1/capabilities/:id` | GET / PATCH / DELETE | — / API key | 查看 / 修改 / 删除能力 |
| `/v1/transactions` | POST | API key | 记录一笔交易 |
| `/v1/agents/:id/reputation` | GET | — | 查询声誉分数 |

完整参数与响应格式见 [docs/API.md](./docs/API.md)，架构决策见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

---

## 当前进度

| 版本 | 状态 | 说明 |
|---|---|---|
| **V1（当前）** | ✅ 可用 | Agent 注册、能力发布与搜索、交易记录、声誉查询、Ed25519 身份 |
| **V2** | ⏳ 规划中 | 联邦注册表 + 跨服务持久身份与声誉质押 |
| **V3** | ⏳ 规划中 | Agent 自主采买服务以维持运营（钱包 + 资源市场） |
| **V4** | ⏳ 探索中 | 能力投资与自我演化（推测性） |

详见 [ROADMAP.md](./ROADMAP.md)。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Node.js 20+ / TypeScript 5.7 |
| HTTP 框架 | Fastify 5 + @fastify/swagger |
| 数据库 | PostgreSQL 15（pg 驱动 + 手写迁移） |
| 加密 | TweetNaCl.js（Ed25519 签名） |
| 测试 | Vitest + Supertest |
| 容器化 | Docker / Docker Compose |

---

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

---

## 参与贡献

问题、想法、反馈 → [GitHub Discussions](https://github.com/HanduoZ/agent-autonomy-protocol/discussions)

**当前最需要的贡献类型：**

- 密码学 / 身份方向：SIGIL 集成研究、Ed25519 替代方案评估
- 治理研究：投票机制、反捕获设计、联邦注册表架构
- 安全审查：红队测试、声誉系统博弈分析
- 示例 agent：实现典型的 buyer / seller 角色，验证协议

请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

关键文档：[PHILOSOPHY.md](./PHILOSOPHY.md) · [AUTONOMY_THESIS.md](./AUTONOMY_THESIS.md) · [PROJECT.md](./PROJECT.md) · [ROADMAP.md](./ROADMAP.md)

MIT License — 详见 [LICENSE](./LICENSE)。
