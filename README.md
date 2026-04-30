# 电商客服 Agent MVP - 完整项目说明

## 项目概述

这是一套**全链路自动化电商客服与工单处理 Agent 系统**的 MVP（最小可行性产品），采用**数学蓝图风格**的技术美学设计。系统通过 AI Agent 实现多步推理能力，自动识别用户意图、处理常规问题、生成工单，并提供完整的工单管理后台和数据统计看板。

## 核心功能

### 1. 用户对话界面
- **实时文字输入**：支持输入订单号和咨询问题
- **消息历史展示**：完整的对话记录
- **推理过程可视化**：实时展示 Agent 的思考步骤（箭头串联形式）
  - 示例：`正在查询订单… → 正在核查物流… → 正在评估退款规则… → 生成处理方案`
- **意图标签**：显示 Agent 识别的用户意图类型
- **数学蓝图风格**：白色网格背景、粉青色和浅粉色配色

### 2. AI Agent 核心逻辑
系统采用**多步推理链**架构，自动执行以下流程：

#### 意图识别
Agent 自动判断用户咨询类型：
- **订单查询**：查询订单状态、商品信息等
- **物流跟踪**：查询物流信息、快递进度
- **退款申请**：处理退款相关问题
- **常规问题**：发货时效、退换货政策等

#### 长链推理处理
对于订单相关问题，Agent 自动执行以下推理链：
```
查询订单 → 查询物流状态 → 评估退款规则 → 生成处理方案
```

每个步骤都被记录，包括：
- 步骤类型（order_query, check_logistics, evaluate_refund, generate_solution）
- 步骤描述（中文）
- 执行结果（JSON 格式）
- 执行耗时（毫秒）

#### 知识库自动应答
对于常规问题，系统直接从知识库返回答案，无需人工干预。

#### 工单自动生成
对于超出权限的复杂问题，系统自动创建工单，包含：
- 完整的上下文信息（订单号、用户信息、对话历史）
- 优先级评估（低/中/高/紧急）
- 问题描述和建议处理方案

### 3. 工单管理后台
**仅管理员可访问**

#### 工单列表
- 按状态分类：待处理 / 处理中 / 已解决
- 显示工单号、标题、优先级、创建时间
- 支持快速状态切换

#### 工单详情
- 完整的工单信息展示
- 上下文信息（JSON 格式）
- 状态更新和解决方案记录

#### 工单统计
- 待处理工单数
- 处理中工单数
- 已解决工单数
- 总工单数

### 4. 数据统计看板
**仅管理员可访问**

#### 核心指标
- **今日对话量**：当天的总对话数
- **自动拦截率**：AI 自动处理的比例（%）
- **工单数量**：创建的工单总数
- **已解决工单**：已完成处理的工单数

#### 实时更新
- 数据每 30 秒自动刷新
- 支持手动刷新按钮
- 进度条可视化展示

## 技术架构

### 后端
- **框架**：Express.js 4 + tRPC 11
- **数据库**：MySQL + Drizzle ORM
- **LLM 集成**：Manus 内置 LLM API
- **认证**：Manus OAuth

### 前端
- **框架**：React 19 + Tailwind CSS 4
- **状态管理**：tRPC + React Query
- **UI 组件**：shadcn/ui
- **路由**：Wouter

### 数据库表设计

| 表名 | 用途 | 关键字段 |
|------|------|--------|
| conversations | 用户对话会话 | userId, title, status, autoInterceptedCount, ticketCreatedCount |
| messages | 对话消息记录 | conversationId, role, content, intent, reasoningSteps, ticketId |
| orders | 订单信息 | orderNumber, userId, productName, amount, status |
| logistics | 物流信息 | orderId, trackingNumber, carrier, status, currentLocation |
| tickets | 工单管理 | ticketNumber, conversationId, userId, status, priority, context |
| reasoning_steps | 推理步骤记录 | messageId, stepType, stepDescription, stepResult, duration |
| knowledge_base | 知识库 | category, question, answer, keywords |
| statistics | 统计数据 | date, totalConversations, autoInterceptedCount, autoInterceptRate, ticketCreatedCount |

## 项目结构

```
ecommerce-agent-mvp/
├── client/                      # 前端代码
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx        # 首页（对话入口）
│   │   │   ├── ChatPage.tsx    # 用户对话页面
│   │   │   ├── TicketManagement.tsx  # 工单管理后台
│   │   │   └── Dashboard.tsx   # 数据统计看板
│   │   ├── App.tsx             # 路由配置
│   │   └── index.css           # 全局样式（数学蓝图风格）
│   └── public/                 # 静态资源
├── server/                      # 后端代码
│   ├── agent.ts                # Agent 核心逻辑
│   ├── agent.test.ts           # Agent 测试
│   ├── db.ts                   # 数据库查询辅助函数
│   ├── routers.ts              # tRPC 路由定义
│   └── _core/                  # 框架核心（OAuth、LLM、存储等）
├── drizzle/                    # 数据库 schema 和迁移
│   └── schema.ts               # 表结构定义
├── shared/                     # 共享常量和类型
└── todo.md                     # 开发任务列表
```

## tRPC API 端点

### 对话管理
- `conversation.create(title)` - 创建新对话
- `conversation.list()` - 获取用户的对话列表
- `conversation.get(conversationId)` - 获取对话详情
- `conversation.getMessages(conversationId)` - 获取对话消息

### Agent 聊天
- `agent.chat(conversationId, message, orderNumber?)` - 发送消息并获取 Agent 响应

### 工单管理（仅管理员）
- `ticket.getPending()` - 获取待处理工单
- `ticket.getProcessing()` - 获取处理中工单
- `ticket.getResolved()` - 获取已解决工单
- `ticket.get(ticketId)` - 获取工单详情
- `ticket.updateStatus(ticketId, status, resolution?)` - 更新工单状态
- `ticket.getStats()` - 获取工单统计

### 数据统计（仅管理员）
- `dashboard.getTodayStats()` - 获取今日统计数据

## 使用指南

### 1. 用户流程
1. 访问首页 → 登录（Manus OAuth）
2. 点击"开始对话"创建新对话
3. 输入订单号（可选）和咨询问题
4. 查看 Agent 的推理过程和响应
5. 点击"显示推理步骤"查看详细的推理链

### 2. 管理员流程
1. 以管理员身份登录
2. 进入"工单管理"查看所有工单
3. 点击工单查看详情
4. 更新工单状态和处理方案
5. 进入"数据看板"查看运营数据

## 推理步骤示例

当用户查询订单时，Agent 会执行以下推理链：

```
→ 正在查询订单…
  订单号: ORD-2024-001
  状态: 已发货
  耗时: 120ms

→ 正在核查物流…
  快递公司: 顺丰
  当前位置: 北京分拨中心
  预计送达: 2024-05-02
  耗时: 150ms

→ 正在评估退款规则…
  订单金额: ¥299
  发货时间: 2024-04-28
  是否可退: 是
  耗时: 80ms

→ 生成处理方案…
  建议: 订单已发货，预计明天送达。如需退款，可在收货后7天内申请。
  耗时: 200ms
```

## 数据持久化

所有数据都被完整保存到数据库：
- **对话记录**：用户消息和 Agent 响应
- **推理步骤**：每个推理步骤的详细信息
- **工单数据**：工单的完整生命周期
- **统计数据**：每日的运营指标

支持历史查询和数据分析。

## 视觉风格

### 设计理念
采用**数学蓝图风格**的简洁技术美学：
- 白色网格背景上点缀精细的几何图形
- 黑色粗重无衬线字体作为大标题
- 纤细的等宽字体作为技术标注
- 柔和的线框风格图形（粉青色与浅粉色）

### 配色方案
- **主色**：蓝色（#2563eb）
- **辅色**：粉青色、浅粉色
- **背景**：白色网格
- **文字**：深灰色

## 后续优化方向

### 邮件提醒系统
- 集成第三方邮件服务（SMTP 或 SendGrid）
- 工单创建时发送邮件提醒
- 工单状态变更时发送邮件通知
- 包含工单摘要和处理链接

### 流式响应
- 实现 SSE 或 WebSocket 流式传输
- 前端逐步渲染 Agent 响应
- 实时显示推理步骤的进度

### 工单搜索和筛选
- 按关键字搜索
- 按优先级筛选
- 按时间范围筛选
- 按处理人员筛选

### 字体系统
- 接入 Google Fonts（黑色粗重无衬线 + 等宽字体）
- 统一全站排版
- 优化可读性

### 测试覆盖
- Agent 集成测试
- API 端点测试
- 前端组件测试
- 端到端测试

## 部署说明

项目支持一键部署。


## 常见问题

**Q: 如何修改 Agent 的行为？**
A: 编辑 `server/agent.ts` 中的 LLM 提示词，修改意图识别、推理链、工单生成的逻辑。

**Q: 如何添加新的知识库条目？**
A: 直接在数据库的 `knowledge_base` 表中插入新记录，或通过管理界面添加（需要实现）。

**Q: 如何自定义工单优先级？**
A: 修改 `drizzle/schema.ts` 中的 `priority` 字段枚举值。

**Q: 如何集成邮件提醒？**
A: 在 `server/routers.ts` 的 `ticket.updateStatus` 中添加邮件发送逻辑。

## 技术支持

项目基于Web 应用模板，包含：
- 完整的 OAuth 认证流程
- 内置 LLM API 集成
- 数据库连接和 ORM
- 前后端通信框架

详见 `README.md`。

---

**版本**：1.0.0 
**最后更新**：2026-04-30  
**状态**：可用于演示和测试
