import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, messages, orders, logistics, tickets, statistics, knowledgeBase } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ 对话相关查询 ============

export async function createConversation(userId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversations).values({
    userId,
    title,
    status: "active",
  });

  // 获取新创建的对话
  const newConv = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.title, title)))
    .limit(1);

  return newConv.length > 0 ? newConv[0] : null;
}

export async function getConversationById(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getConversationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(conversations).where(eq(conversations.userId, userId));
}

export async function updateConversationStats(conversationId: number, autoIntercepted: number = 0, ticketCreated: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conv = await getConversationById(conversationId);
  if (!conv) return;

  await db
    .update(conversations)
    .set({
      autoInterceptedCount: conv.autoInterceptedCount + autoIntercepted,
      ticketCreatedCount: conv.ticketCreatedCount + ticketCreated,
    })
    .where(eq(conversations.id, conversationId));
}

// ============ 消息相关查询 ============

export async function createMessage(conversationId: number, role: "user" | "assistant", content: string, intent?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values({
    conversationId,
    role,
    content,
    intent,
  });

  // 获取新创建的消息
  const newMsg = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.content, content)))
    .orderBy(messages.createdAt)
    .limit(1);

  return newMsg.length > 0 ? newMsg[0] : null;
}

export async function getMessagesByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(messages).where(eq(messages.conversationId, conversationId));
}

export async function updateMessageWithReasoningSteps(messageId: number, reasoningSteps: any[], intent: string, ticketId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(messages)
    .set({
      reasoningSteps,
      intent,
      ticketId,
    })
    .where(eq(messages.id, messageId));
}

// ============ 统计相关查询 ============

export async function getTodayStatistics() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select()
    .from(statistics)
    .where(eq(statistics.date, today))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateStatistics(date: Date, data: Partial<typeof statistics.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getTodayStatistics();

  if (existing) {
    await db.update(statistics).set(data).where(eq(statistics.date, date));
  } else {
    await db.insert(statistics).values({
      date,
      ...data,
    });
  }
}

// ============ 工单相关查询 ============

export async function getTicketsByStatus(status: "待处理" | "处理中" | "已解决") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(tickets).where(eq(tickets.status, status));
}

export async function getTicketById(ticketId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateTicketStatus(ticketId: number, status: "待处理" | "处理中" | "已解决", resolution?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (status === "已解决") {
    updateData.resolvedAt = new Date();
    if (resolution) {
      updateData.resolution = resolution;
    }
  }

  await db.update(tickets).set(updateData).where(eq(tickets.id, ticketId));
}

export async function getTicketsCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pendingTickets = await db.select().from(tickets).where(eq(tickets.status, "待处理"));
  const processingTickets = await db.select().from(tickets).where(eq(tickets.status, "处理中"));
  const resolvedTickets = await db.select().from(tickets).where(eq(tickets.status, "已解决"));

  return {
    pending: pendingTickets.length,
    processing: processingTickets.length,
    resolved: resolvedTickets.length,
    total: pendingTickets.length + processingTickets.length + resolvedTickets.length,
  };
}
