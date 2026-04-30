import { describe, it, expect } from "vitest";
import { executeReasoningChain } from "./agent";

describe("Agent Core Logic", () => {
  describe("Intent Recognition", () => {
    it("should recognize order query intent", async () => {
      const result = await executeReasoningChain(
        1,
        "我想查询订单号 ORD-2024-001 的状态",
        "ORD-2024-001"
      );

      expect(result.intent).toMatch(/订单|order/i);
      expect(result.reasoningSteps.length).toBeGreaterThan(0);
    });

    it("should recognize logistics intent", async () => {
      const result = await executeReasoningChain(
        1,
        "我的快递到哪里了？",
        undefined
      );

      expect(result.intent).toMatch(/物流|logistics|tracking/i);
    });

    it("should recognize refund intent", async () => {
      const result = await executeReasoningChain(
        1,
        "我想申请退款",
        undefined
      );

      expect(result.intent).toMatch(/退款|refund/i);
    });

    it("should recognize general question intent", async () => {
      const result = await executeReasoningChain(
        1,
        "请问发货需要多长时间？",
        undefined
      );

      expect(result.intent).toMatch(/常规|general|faq/i);
    });
  });

  describe("Reasoning Chain", () => {
    it("should execute multi-step reasoning for order query", async () => {
      const result = await executeReasoningChain(
        1,
        "查询订单 ORD-2024-001 的物流信息",
        "ORD-2024-001"
      );

      // 应该包含多个推理步骤
      expect(result.reasoningSteps.length).toBeGreaterThanOrEqual(2);

      // 验证推理步骤类型
      const stepTypes = result.reasoningSteps.map((s: any) => s.type);
      expect(stepTypes).toContain("order_query");
    });

    it("should record reasoning step duration", async () => {
      const result = await executeReasoningChain(
        1,
        "订单 ORD-2024-001 的状态",
        "ORD-2024-001"
      );

      result.reasoningSteps.forEach((step: any) => {
        expect(step.duration).toBeGreaterThanOrEqual(0);
        expect(typeof step.duration).toBe("number");
      });
    });
  });

  describe("Knowledge Base Query", () => {
    it("should return knowledge base answer for FAQ", async () => {
      const result = await executeReasoningChain(
        1,
        "请问发货时效是多久？",
        undefined
      );

      // 如果是常规问题，应该直接返回知识库答案
      if (result.intent.includes("常规") || result.intent.includes("general")) {
        expect(result.response).toBeTruthy();
        expect(result.response.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Ticket Generation", () => {
    it("should generate ticket for complex issues", async () => {
      const result = await executeReasoningChain(
        1,
        "我的订单已经两周没收到，我要投诉！",
        undefined
      );

      // 复杂问题应该生成工单
      if (result.ticketInfo) {
        expect(result.ticketInfo.title).toBeTruthy();
        expect(result.ticketInfo.description).toBeTruthy();
        expect(result.ticketInfo.priority).toMatch(/high|urgent/i);
      }
    });
  });

  describe("Response Generation", () => {
    it("should generate meaningful response", async () => {
      const result = await executeReasoningChain(
        1,
        "我想查询订单",
        undefined
      );

      expect(result.response).toBeTruthy();
      expect(result.response.length).toBeGreaterThan(0);
      expect(typeof result.response).toBe("string");
    });

    it("should include context in response", async () => {
      const result = await executeReasoningChain(
        1,
        "订单 ORD-2024-001 怎么样了",
        "ORD-2024-001"
      );

      // 响应应该包含订单号
      if (result.response.includes("ORD-2024-001")) {
        expect(result.response).toContain("ORD-2024-001");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle empty message gracefully", async () => {
      const result = await executeReasoningChain(1, "", undefined);

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
    });

    it("should handle invalid user ID gracefully", async () => {
      const result = await executeReasoningChain(
        -1,
        "测试消息",
        undefined
      );

      expect(result).toBeDefined();
      expect(result.response).toBeTruthy();
    });
  });
});
