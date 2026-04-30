import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============ 对话与消息表 ============
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "closed"]).default("active").notNull(),
  autoInterceptedCount: int("autoInterceptedCount").default(0).notNull(),
  ticketCreatedCount: int("ticketCreatedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  intent: varchar("intent", { length: 50 }), // 意图类型：order_query, logistics, refund, general_qa
  reasoningSteps: json("reasoningSteps"), // 推理步骤 JSON 数组
  ticketId: int("ticketId"), // 如果生成了工单，关联工单 ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============ 订单表 ============
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "shipped", "delivered", "cancelled", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ============ 物流表 ============
export const logistics = mysqlTable("logistics", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  trackingNumber: varchar("trackingNumber", { length: 100 }).notNull().unique(),
  carrier: varchar("carrier", { length: 50 }).notNull(), // 快递公司
  status: mysqlEnum("status", ["pending", "in_transit", "out_for_delivery", "delivered", "exception"]).default("pending").notNull(),
  currentLocation: varchar("currentLocation", { length: 255 }),
  estimatedDelivery: timestamp("estimatedDelivery"),
  trackingHistory: json("trackingHistory"), // 轨迹历史 JSON 数组
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Logistic = typeof logistics.$inferSelect;
export type InsertLogistic = typeof logistics.$inferInsert;

// ============ 工单表 ============
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  ticketNumber: varchar("ticketNumber", { length: 50 }).notNull().unique(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  assignedTo: int("assignedTo"), // 分配给哪个管理员
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["待处理", "处理中", "已解决"]).default("待处理").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  context: json("context"), // 工单上下文（订单信息、物流信息等）
  resolution: text("resolution"), // 解决方案
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ============ 推理步骤表 ============
export const reasoningSteps = mysqlTable("reasoning_steps", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  stepNumber: int("stepNumber").notNull(),
  stepType: varchar("stepType", { length: 50 }).notNull(), // query_order, check_logistics, evaluate_refund, generate_solution
  stepDescription: varchar("stepDescription", { length: 255 }).notNull(),
  stepResult: json("stepResult"), // 步骤结果 JSON
  duration: int("duration"), // 执行耗时（毫秒）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReasoningStep = typeof reasoningSteps.$inferSelect;
export type InsertReasoningStep = typeof reasoningSteps.$inferInsert;

// ============ 知识库表 ============
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 100 }).notNull(), // 分类：shipping_time, refund_policy, return_policy 等
  question: varchar("question", { length: 255 }).notNull(),
  answer: text("answer").notNull(),
  keywords: json("keywords"), // 关键词数组，用于意图匹配
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseEntry = typeof knowledgeBase.$inferInsert;

// ============ 统计数据表 ============
export const statistics = mysqlTable("statistics", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  totalConversations: int("totalConversations").default(0).notNull(),
  autoInterceptedCount: int("autoInterceptedCount").default(0).notNull(),
  autoInterceptRate: decimal("autoInterceptRate", { precision: 5, scale: 2 }).default("0").notNull(),
  ticketCreatedCount: int("ticketCreatedCount").default(0).notNull(),
  ticketResolvedCount: int("ticketResolvedCount").default(0).notNull(),
  averageResponseTime: int("averageResponseTime").default(0).notNull(), // 平均响应时间（毫秒）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Statistic = typeof statistics.$inferSelect;
export type InsertStatistic = typeof statistics.$inferInsert;