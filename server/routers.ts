import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  executeReasoningChain,
  createTicket,
  saveReasoningSteps,
  identifyIntent,
} from "./agent";
import {
  createConversation,
  getConversationById,
  getConversationsByUserId,
  createMessage,
  getMessagesByConversationId,
  updateMessageWithReasoningSteps,
  updateConversationStats,
  getTicketsByStatus,
  getTicketById,
  updateTicketStatus,
  getTicketsCount,
  getTodayStatistics,
  updateStatistics,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ 对话相关 API ============
  conversation: router({
    // 创建新对话
    create: protectedProcedure
      .input(z.object({ title: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const conversation = await createConversation(ctx.user.id, input.title);
        return conversation;
      }),

    // 获取用户的所有对话
    list: protectedProcedure.query(async ({ ctx }) => {
      const conversations = await getConversationsByUserId(ctx.user.id);
      return conversations;
    }),

    // 获取对话详情
    get: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const conversation = await getConversationById(input.conversationId);
        return conversation;
      }),

    // 获取对话的所有消息
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        const messages = await getMessagesByConversationId(input.conversationId);
        return messages;
      }),
  }),

  // ============ Agent 对话 API ============
  agent: router({
    // 发送用户消息并获取 Agent 响应
    chat: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          message: z.string(),
          orderNumber: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // 1. 创建用户消息记录
          const userMessage = await createMessage(input.conversationId, "user", input.message);
          if (!userMessage) throw new Error("Failed to create user message");

          // 2. 识别意图
          const intent = await identifyIntent(input.message);

          // 3. 执行推理链
          const agentResponse = await executeReasoningChain(intent, input.message, input.orderNumber);

          // 4. 保存推理步骤
          await saveReasoningSteps(userMessage.id, agentResponse.reasoningSteps);

          // 5. 创建 Assistant 消息记录
          const assistantMessage = await createMessage(
            input.conversationId,
            "assistant",
            agentResponse.response,
            intent
          );

          if (!assistantMessage) throw new Error("Failed to create assistant message");

          // 6. 如果需要创建工单
          let ticketId: number | null = null;
          if (agentResponse.shouldCreateTicket && agentResponse.ticketInfo) {
            const ticket = await createTicket(
              input.conversationId,
              ctx.user.id,
              agentResponse.ticketInfo.title,
              agentResponse.ticketInfo.description,
              agentResponse.ticketInfo.context
            );

            if (ticket) {
              ticketId = ticket.id;
              // 更新消息关联的工单 ID
              await updateMessageWithReasoningSteps(assistantMessage.id, agentResponse.reasoningSteps, intent, ticketId ?? undefined);
              // 更新对话统计
              await updateConversationStats(input.conversationId, 0, 1);
            }
          } else {
            // 自动拦截（未创建工单）
            await updateConversationStats(input.conversationId, 1, 0);
            await updateMessageWithReasoningSteps(assistantMessage.id, agentResponse.reasoningSteps, intent);
          }

          // 7. 更新今日统计
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const stats = await getTodayStatistics();
          if (stats) {
            const newAutoInterceptedCount = agentResponse.shouldCreateTicket
              ? stats.autoInterceptedCount
              : stats.autoInterceptedCount + 1;
            const newTicketCount = agentResponse.shouldCreateTicket
              ? stats.ticketCreatedCount + 1
              : stats.ticketCreatedCount;

            await updateStatistics(today, {
              totalConversations: stats.totalConversations + 1,
              autoInterceptedCount: newAutoInterceptedCount,
              autoInterceptRate: ((newAutoInterceptedCount / (stats.totalConversations + 1)) * 100) as any,
              ticketCreatedCount: newTicketCount,
            });
          } else {
            const newAutoInterceptedCount = agentResponse.shouldCreateTicket ? 0 : 1;
            await updateStatistics(today, {
              totalConversations: 1,
              autoInterceptedCount: newAutoInterceptedCount,
              autoInterceptRate: (newAutoInterceptedCount * 100) as any,
              ticketCreatedCount: agentResponse.shouldCreateTicket ? 1 : 0,
            });
          }

          return {
            success: true,
            messageId: assistantMessage.id,
            response: agentResponse.response,
            reasoningSteps: agentResponse.reasoningSteps,
            ticketId,
            intent,
          };
        } catch (error) {
          console.error("Chat error:", error);
          throw error;
        }
      }),
  }),

  // ============ 工单管理 API ============
  ticket: router({
    // 获取所有待处理工单
    getPending: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view tickets");
      }
      const tickets = await getTicketsByStatus("待处理");
      return tickets;
    }),

    // 获取所有处理中工单
    getProcessing: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view tickets");
      }
      const tickets = await getTicketsByStatus("处理中");
      return tickets;
    }),

    // 获取所有已解决工单
    getResolved: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view tickets");
      }
      const tickets = await getTicketsByStatus("已解决");
      return tickets;
    }),

    // 获取工单详情
    get: protectedProcedure
      .input(z.object({ ticketId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Only admins can view tickets");
        }
        const ticket = await getTicketById(input.ticketId);
        return ticket;
      }),

    // 更新工单状态
    updateStatus: protectedProcedure
      .input(
        z.object({
          ticketId: z.number(),
          status: z.enum(["待处理", "处理中", "已解决"]),
          resolution: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new Error("Only admins can update tickets");
        }
        await updateTicketStatus(input.ticketId, input.status, input.resolution);
        const ticket = await getTicketById(input.ticketId);
        return ticket;
      }),

    // 获取工单统计
    getStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view statistics");
      }
      const stats = await getTicketsCount();
      return stats;
    }),
  }),

  // ============ 统计看板 API ============
  dashboard: router({
    // 获取今日统计数据
    getTodayStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view dashboard");
      }
      const stats = await getTodayStatistics();
      return stats || {
        totalConversations: 0,
        autoInterceptedCount: 0,
        autoInterceptRate: 0,
        ticketCreatedCount: 0,
        ticketResolvedCount: 0,
        averageResponseTime: 0,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
