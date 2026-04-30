import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, TrendingUp, MessageSquare, CheckCircle2, AlertTriangle } from "lucide-react";

interface DashboardStats {
  totalConversations: number;
  autoInterceptedCount: number;
  autoInterceptRate: number | string;
  ticketCreatedCount: number;
  ticketResolvedCount: number;
  averageResponseTime: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 检查权限
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-semibold">无权限访问</p>
          <p className="text-gray-600 text-sm mt-2">只有管理员可以访问数据统计看板</p>
        </Card>
      </div>
    );
  }

  // 获取统计数据
  const { data: dashboardData, isLoading, refetch } = trpc.dashboard.getTodayStats.useQuery();

  useEffect(() => {
    if (dashboardData) {
      const rate = typeof dashboardData.autoInterceptRate === 'string' 
        ? parseFloat(dashboardData.autoInterceptRate) 
        : dashboardData.autoInterceptRate;
      setStats({
        ...dashboardData,
        autoInterceptRate: rate,
      });
    }
  }, [dashboardData]);

  // 自动刷新（每 30 秒）
  useEffect(() => {
    const interval = setInterval(() => {
      setIsRefreshing(true);
      refetch().finally(() => setIsRefreshing(false));
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent),
                          linear-gradient(90deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent)`,
        backgroundSize: "50px 50px",
      }} />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 标题 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">数据统计看板</h1>
            <p className="text-gray-600">实时监控客服系统运营数据</p>
          </div>
          <button
            onClick={() => {
              setIsRefreshing(true);
              refetch().finally(() => setIsRefreshing(false));
            }}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            刷新
          </button>
        </div>

        {stats && (
          <>
            {/* 核心指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* 今日对话量 */}
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-600 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">今日对话量</p>
                    <p className="text-4xl font-black text-blue-600 mt-2">{stats.totalConversations}</p>
                    <p className="text-xs text-gray-500 mt-2">次对话</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-blue-400 opacity-50" />
                </div>
              </Card>

              {/* 自动拦截率 */}
              <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-600 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">自动拦截率</p>
                    <p className="text-4xl font-black text-green-600 mt-2">{(typeof stats.autoInterceptRate === 'number' ? stats.autoInterceptRate : parseFloat(stats.autoInterceptRate)).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-2">{stats.autoInterceptedCount} 次自动处理</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
                </div>
              </Card>

              {/* 工单数量 */}
              <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-600 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">工单数量</p>
                    <p className="text-4xl font-black text-orange-600 mt-2">{stats.ticketCreatedCount}</p>
                    <p className="text-xs text-gray-500 mt-2">待处理工单</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-400 opacity-50" />
                </div>
              </Card>

              {/* 已解决工单 */}
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-600 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">已解决工单</p>
                    <p className="text-4xl font-black text-purple-600 mt-2">{stats.ticketResolvedCount}</p>
                    <p className="text-xs text-gray-500 mt-2">已完成</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-purple-400 opacity-50" />
                </div>
              </Card>
            </div>

            {/* 详细统计 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 对话效率分析 */}
              <Card className="p-6 bg-white">
                <h2 className="text-xl font-bold text-gray-900 mb-4">对话效率分析</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">自动处理率</span>
                      <span className="text-sm font-semibold text-gray-900">{(typeof stats.autoInterceptRate === 'number' ? stats.autoInterceptRate : parseFloat(stats.autoInterceptRate)).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(typeof stats.autoInterceptRate === 'number' ? stats.autoInterceptRate : parseFloat(stats.autoInterceptRate), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">平均响应时间</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.averageResponseTime}ms</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                    <p className="text-xs text-gray-600">自动处理</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.autoInterceptedCount || 0}</p>
                      </div>
                      <div>
                    <p className="text-xs text-gray-600">人工处理</p>
                    <p className="text-2xl font-bold text-orange-600">{stats?.ticketCreatedCount || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 工单处理统计 */}
              <Card className="p-6 bg-white">
                <h2 className="text-xl font-bold text-gray-900 mb-4">工单处理统计</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">解决率</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {stats.ticketCreatedCount > 0
                          ? ((stats.ticketResolvedCount / stats.ticketCreatedCount) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${
                            stats.ticketCreatedCount > 0
                              ? (stats.ticketResolvedCount / stats.ticketCreatedCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">创建工单</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.ticketCreatedCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">已解决</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.ticketResolvedCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600">待处理工单</p>
                    <p className="text-2xl font-bold text-red-600">
                      {Math.max(0, stats.ticketCreatedCount - stats.ticketResolvedCount)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 底部提示 */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>提示：</strong> 数据每 30 秒自动刷新一次。自动拦截率越高，说明 AI 客服处理能力越强。
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
