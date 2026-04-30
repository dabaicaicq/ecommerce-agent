import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { useRoute } from "wouter";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  reasoningSteps?: any[];
  intent?: string;
  createdAt: Date;
}

interface ReasoningStep {
  type: string;
  description: string;
  result: Record<string, any>;
  duration: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [, params] = useRoute("/chat/:conversationId");
  const conversationId = params?.conversationId ? parseInt(params.conversationId) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReasoningSteps, setShowReasoningSteps] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取对话消息
  const { data: conversationMessages, isLoading: messagesLoading } = trpc.conversation.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  // 发送消息 mutation
  const sendMessageMutation = trpc.agent.chat.useMutation({
    onSuccess: (response) => {
      // 添加 assistant 消息
      const newMessage: Message = {
        id: response.messageId,
        role: "assistant",
        content: response.response,
        reasoningSteps: response.reasoningSteps,
        intent: response.intent,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setInputValue("");
      setOrderNumber("");
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Send message error:", error);
      setIsLoading(false);
    },
  });

  // 初始化消息列表
  useEffect(() => {
    if (conversationMessages) {
      setMessages(
        conversationMessages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          reasoningSteps: msg.reasoningSteps,
          intent: msg.intent,
          createdAt: new Date(msg.createdAt),
        }))
      );
    }
  }, [conversationMessages]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversationId || isLoading) return;

    // 添加用户消息到 UI
    const userMessage: Message = {
      id: Math.random(),
      role: "user",
      content: inputValue,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // 发送消息
    await sendMessageMutation.mutateAsync({
      conversationId,
      message: inputValue,
      orderNumber: orderNumber || undefined,
    });
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p>Invalid conversation ID</p>
        </Card>
      </div>
    );
  }

  if (messagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* 网格背景装饰 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent),
                          linear-gradient(90deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent)`,
        backgroundSize: "50px 50px",
      }} />

      {/* 消息容器 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">开始对话</p>
              <p className="text-gray-400 text-sm mt-2">输入您的问题，AI 客服将为您服务</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xl px-4 py-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"
                }`}
              >
                <Streamdown>{message.content}</Streamdown>

                {/* 推理步骤展示 */}
                {message.reasoningSteps && message.reasoningSteps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() =>
                        setShowReasoningSteps((prev) => ({
                          ...prev,
                          [message.id]: !prev[message.id],
                        }))
                      }
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showReasoningSteps[message.id] ? "隐藏" : "显示"}推理步骤
                    </button>

                    {showReasoningSteps[message.id] && (
                      <div className="mt-2 space-y-2 text-xs">
                        {message.reasoningSteps.map((step: ReasoningStep, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">→</span>
                            <div className="flex-1">
                              <p className="text-gray-700">{step.description}</p>
                              <p className="text-gray-500 mt-1">耗时: {step.duration}ms</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 意图标签 */}
                {message.intent && (
                  <div className="mt-2 inline-block">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {message.intent}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 bg-white p-4 md:p-6 relative z-10 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="输入订单号（可选）"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="输入您的问题..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
