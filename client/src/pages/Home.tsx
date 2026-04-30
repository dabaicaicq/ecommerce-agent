import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, MessageCircle, BarChart3, Settings } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const createConversationMutation = trpc.conversation.create.useMutation({
    onSuccess: (conversation) => {
      if (conversation) {
        navigate(`/chat/${conversation.id}`);
      }
    },
    onError: (error) => {
      console.error("Create conversation error:", error);
      setIsCreatingConversation(false);
    },
  });

  const handleStartChat = async () => {
    if (!isAuthenticated) return;
    setIsCreatingConversation(true);
    await createConversationMutation.mutateAsync({
      title: `对话 - ${new Date().toLocaleString()}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent),
                          linear-gradient(90deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent)`,
        backgroundSize: "50px 50px",
      }} />

      {/* 导航栏 */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">电商客服 Agent</h1>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && user?.role === "admin" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  数据看板
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/tickets")}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  工单管理
                </Button>
              </>
            )}
            {isAuthenticated && (
              <div className="text-sm text-gray-600">
                欢迎, <span className="font-semibold">{user?.name || "用户"}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 主容器 */}
      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {!isAuthenticated ? (
          // 未登录状态
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-6">🤖</div>
              <h2 className="text-4xl font-black text-gray-900 mb-4">AI 智能客服系统</h2>
              <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                基于多步推理的电商客服 Agent，具备意图识别、长链推理、工单管理等功能
              </p>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={() => {
                  // 触发登录
                  window.location.href = "/api/oauth/login";
                }}
              >
                <MessageCircle className="w-5 h-5" />
                登录开始对话
              </Button>
            </div>
          </div>
        ) : (
          // 已登录状态
          <div className="space-y-12">
            {/* 欢迎区域 */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-gray-900 mb-4">欢迎使用 AI 客服系统</h2>
              <p className="text-gray-600 text-lg">选择您要进行的操作</p>
            </div>

            {/* 功能卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 开始对话 */}
              <Card className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={handleStartChat}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💬</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">开始对话</h3>
                <p className="text-gray-600 mb-6">
                  与 AI 客服进行实时对话，获取订单查询、物流跟踪、退款等帮助
                </p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isCreatingConversation}
                >
                  {isCreatingConversation ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      创建中...
                    </>
                  ) : (
                    "开始对话"
                  )}
                </Button>
              </Card>

              {/* 工单管理（仅管理员） */}
              {user?.role === "admin" && (
                <Card className="p-8 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate("/tickets")}
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📋</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">工单管理</h3>
                  <p className="text-gray-600 mb-6">
                    查看和管理所有客服工单，更新工单状态和处理方案
                  </p>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    进入工单管理
                  </Button>
                </Card>
              )}

              {/* 数据看板（仅管理员） */}
              {user?.role === "admin" && (
                <Card className="p-8 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate("/dashboard")}
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📊</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">数据看板</h3>
                  <p className="text-gray-600 mb-6">
                    实时查看客服系统的运营数据，包括对话量、自动拦截率等
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    查看看板
                  </Button>
                </Card>
              )}
            </div>

            {/* 功能介绍 */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🧠 智能推理</h3>
                <p className="text-gray-600">
                  系统采用多步推理链，自动识别用户意图，串联订单查询、物流跟踪、退款评估等步骤，提供精准的解决方案。
                </p>
              </Card>

              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">⚡ 自动拦截</h3>
                <p className="text-gray-600">
                  对于常规问题和可自动处理的咨询，系统直接从知识库返回答案，大幅提升处理效率，自动拦截率可达 75% 以上。
                </p>
              </Card>

              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📋 工单管理</h3>
                <p className="text-gray-600">
                  对于复杂问题，系统自动生成工单，包含完整的上下文信息，支持管理员快速处理和状态跟踪。
                </p>
              </Card>

              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📈 数据统计</h3>
                <p className="text-gray-600">
                  实时统计对话量、自动拦截率、工单数量等核心指标，帮助管理员了解系统运营状态。
                </p>
              </Card>
            </div>

            {/* 最近对话 */}
            <RecentConversations />
          </div>
        )}
      </div>
    </div>
  );
}

function RecentConversations() {
  const { data: conversations, isLoading } = trpc.conversation.list.useQuery();
  const [, navigate] = useLocation();

  if (isLoading) {
    return null;
  }

  if (!conversations || conversations.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">最近对话</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {conversations.slice(0, 6).map((conv: any) => (
          <Card
            key={conv.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/chat/${conv.id}`)}
          >
            <h4 className="font-semibold text-gray-900 truncate">{conv.title}</h4>
            <p className="text-sm text-gray-500 mt-1">
              创建于: {new Date(conv.createdAt).toLocaleString()}
            </p>
            <div className="flex gap-2 mt-3 text-xs">
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {conv.autoInterceptedCount} 自动处理
              </span>
              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                {conv.ticketCreatedCount} 工单
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
