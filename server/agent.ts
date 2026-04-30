import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { orders, logistics, knowledgeBase, tickets, messages, reasoningSteps } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 意图识别类型
 */
export type IntentType = "order_query" | "logistics" | "refund" | "general_qa" | "unknown";

/**
 * 推理步骤类型
 */
export type ReasoningStepType = "query_order" | "check_logistics" | "evaluate_refund" | "generate_solution" | "query_knowledge_base";

/**
 * 推理步骤结果
 */
export interface ReasoningStepResult {
  type: ReasoningStepType;
  description: string;
  result: Record<string, any>;
  duration: number;
}

/**
 * Agent 响应结果
 */
export interface AgentResponse {
  intent: IntentType;
  response: string;
  reasoningSteps: ReasoningStepResult[];
  shouldCreateTicket: boolean;
  ticketInfo?: {
    title: string;
    description: string;
    context: Record<string, any>;
  };
}

/**
 * 意图识别：通过 LLM 判断用户咨询类型
 */
export async function identifyIntent(userMessage: string): Promise<IntentType> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for an e-commerce customer service system. 
          Classify the user's message into one of these categories:
          - "order_query": Questions about order status, order details
          - "logistics": Questions about shipping, delivery tracking
          - "refund": Refund requests, return requests
          - "general_qa": General questions about policies, shipping time, return policy
          - "unknown": Cannot determine intent
          
          Respond with ONLY the intent type, nothing else.`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const contentRaw = response.choices[0]?.message.content;
    const intent = (typeof contentRaw === "string" ? contentRaw.trim().toLowerCase() : "unknown") as IntentType;
    return ["order_query", "logistics", "refund", "general_qa"].includes(intent) ? intent : "unknown";
  } catch (error) {
    console.error("Intent identification error:", error);
    return "unknown";
  }
}

/**
 * 查询订单信息
 */
export async function queryOrder(orderNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * 查询物流信息
 */
export async function queryLogistics(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(logistics).where(eq(logistics.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * 查询知识库
 */
export async function queryKnowledgeBase(keywords: string[]): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 简单的关键词匹配（实际应用可使用全文搜索）
  const results = await db.select().from(knowledgeBase).where(eq(knowledgeBase.isActive, 1));

  return results.filter((entry) => {
    const entryKeywords = (entry.keywords as string[]) || [];
    return keywords.some((kw) => entryKeywords.some((ek) => ek.toLowerCase().includes(kw.toLowerCase())));
  });
}

/**
 * 评估退款规则
 */
export async function evaluateRefundRules(order: any, reason: string): Promise<{ eligible: boolean; reason: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an e-commerce refund policy evaluator.
          Based on the order information and refund reason, determine if the customer is eligible for a refund.
          Consider factors like: order status, time since purchase, reason validity.
          
          Respond with a JSON object: { "eligible": boolean, "reason": string }`,
        },
        {
          role: "user",
          content: `Order: ${JSON.stringify(order)}\nRefund Reason: ${reason}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "refund_evaluation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              eligible: { type: "boolean" },
              reason: { type: "string" },
            },
            required: ["eligible", "reason"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (content && typeof content === "string") {
      return JSON.parse(content);
    }
    return { eligible: false, reason: "Unable to evaluate" };
  } catch (error) {
    console.error("Refund evaluation error:", error);
    return { eligible: false, reason: "Error during evaluation" };
  }
}

/**
 * 生成处理方案
 */
export async function generateSolution(
  intent: IntentType,
  userMessage: string,
  context: Record<string, any>
): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a professional e-commerce customer service agent.
          Based on the customer's inquiry and context, provide a helpful and professional solution.
          Be concise, clear, and empathetic. If you cannot resolve the issue, suggest escalation to a human agent.`,
        },
        {
          role: "user",
          content: `Intent: ${intent}\nMessage: ${userMessage}\nContext: ${JSON.stringify(context)}`,
        },
      ],
    });

    const content = response.choices[0]?.message.content;
  return typeof content === "string" ? content : "Unable to generate solution";
  } catch (error) {
    console.error("Solution generation error:", error);
    return "I apologize, but I encountered an error while processing your request. A human agent will assist you shortly.";
  }
}

/**
 * 长链推理处理流程
 */
export async function executeReasoningChain(
  intent: IntentType,
  userMessage: string,
  orderNumber?: string
): Promise<AgentResponse> {
  const reasoningSteps: ReasoningStepResult[] = [];
  let context: Record<string, any> = {};
  let shouldCreateTicket = false;

  try {
    // Step 1: 如果是订单相关，查询订单信息
    if ((intent === "order_query" || intent === "logistics" || intent === "refund") && orderNumber) {
      const startTime = Date.now();
      const order = await queryOrder(orderNumber);
      const duration = Date.now() - startTime;

      reasoningSteps.push({
        type: "query_order",
        description: `正在查询订单 ${orderNumber}…`,
        result: { order: order || null },
        duration,
      });

      if (order) {
        context.order = order;

        // Step 2: 如果订单存在，查询物流信息
        if (intent === "logistics" || (intent === "order_query" && order.status === "shipped")) {
          const logisticsStartTime = Date.now();
          const logisticsInfo = await queryLogistics(order.id);
          const logisticsDuration = Date.now() - logisticsStartTime;

          reasoningSteps.push({
            type: "check_logistics",
            description: `正在核查物流…`,
            result: { logistics: logisticsInfo || null },
            duration: logisticsDuration,
          });

          if (logisticsInfo) {
            context.logistics = logisticsInfo;
          }
        }

        // Step 3: 如果是退款请求，评估退款规则
        if (intent === "refund") {
          const refundStartTime = Date.now();
          const refundEvaluation = await evaluateRefundRules(order, userMessage);
          const refundDuration = Date.now() - refundStartTime;

          reasoningSteps.push({
            type: "evaluate_refund",
            description: `正在评估退款规则…`,
            result: refundEvaluation,
            duration: refundDuration,
          });

          context.refundEvaluation = refundEvaluation;

          // 如果不符合退款条件，需要创建工单
          if (!refundEvaluation.eligible) {
            shouldCreateTicket = true;
          }
        }
      } else {
        // 订单不存在，需要创建工单
        shouldCreateTicket = true;
      }
    } else if (intent === "general_qa") {
      // Step 2: 查询知识库
      const kbStartTime = Date.now();
      const keywords = userMessage.split(" ").slice(0, 5);
      const kbResults = await queryKnowledgeBase(keywords);
      const kbDuration = Date.now() - kbStartTime;

      reasoningSteps.push({
        type: "query_knowledge_base",
        description: `正在查询知识库…`,
        result: { results: kbResults },
        duration: kbDuration,
      });

      if (kbResults.length > 0) {
        context.knowledgeBase = kbResults[0];
      }
    }

    // Step 4: 生成处理方案
    const solutionStartTime = Date.now();
    const solution = await generateSolution(intent, userMessage, context);
    const solutionDuration = Date.now() - solutionStartTime;

    reasoningSteps.push({
      type: "generate_solution",
      description: `正在生成处理方案…`,
      result: { solution: typeof solution === "string" ? solution : String(solution) },
      duration: solutionDuration,
    });

    return {
      intent,
      response: typeof solution === "string" ? solution : String(solution),
      reasoningSteps,
      shouldCreateTicket,
      ticketInfo: shouldCreateTicket
        ? {
            title: `${intent.toUpperCase()}: ${userMessage.substring(0, 50)}`,
            description: userMessage,
            context,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Reasoning chain error:", error);

    return {
      intent,
      response: "I apologize, but I encountered an error while processing your request. A human agent will assist you shortly.",
      reasoningSteps,
      shouldCreateTicket: true,
      ticketInfo: {
        title: `Error Processing: ${userMessage.substring(0, 50)}`,
        description: userMessage,
        context: { error: String(error) },
      },
    };
  }
}

/**
 * 创建工单
 */
export async function createTicket(
  conversationId: number,
  userId: number,
  title: string,
  description: string,
  context: Record<string, any>
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  await db.insert(tickets).values({
    ticketNumber,
    conversationId,
    userId,
    title,
    description,
    status: "待处理",
    priority: "medium",
    context,
  });

  // 查询新创建的工单
  const newTicket = await db
    .select()
    .from(tickets)
    .where(eq(tickets.ticketNumber, ticketNumber))
    .limit(1);

  return newTicket.length > 0 ? newTicket[0] : null;
}

/**
 * 保存推理步骤到数据库
 */
export async function saveReasoningSteps(messageId: number, steps: ReasoningStepResult[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await db.insert(reasoningSteps).values({
      messageId,
      stepNumber: i + 1,
      stepType: step.type,
      stepDescription: step.description,
      stepResult: step.result,
      duration: step.duration,
    });
  }
}
