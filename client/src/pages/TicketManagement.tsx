import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  status: "待处理" | "处理中" | "已解决";
  priority: "low" | "medium" | "high" | "urgent";
  context?: any;
  resolution?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function TicketManagement() {
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"待处理" | "处理中" | "已解决" | undefined>(undefined);
  const [resolution, setResolution] = useState("");

  // 检查权限
  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-semibold">无权限访问</p>
          <p className="text-gray-600 text-sm mt-2">只有管理员可以访问工单管理</p>
        </Card>
      </div>
    );
  }

  // 获取工单数据
  const { data: pendingTickets, isLoading: pendingLoading, refetch: refetchPending } = trpc.ticket.getPending.useQuery();
  const { data: processingTickets, isLoading: processingLoading, refetch: refetchProcessing } = trpc.ticket.getProcessing.useQuery();
  const { data: resolvedTickets, isLoading: resolvedLoading, refetch: refetchResolved } = trpc.ticket.getResolved.useQuery();
  const { data: ticketStats } = trpc.ticket.getStats.useQuery();

  // 更新工单状态
  const updateStatusMutation = trpc.ticket.updateStatus.useMutation({
    onSuccess: () => {
      refetchPending();
      refetchProcessing();
      refetchResolved();
      setIsDetailDialogOpen(false);
      setResolution("");
      setSelectedTicket(null);
      setUpdateStatus(undefined);
    },
  });

  const handleUpdateStatus = async () => {
    if (!selectedTicket || updateStatus === undefined) return;

    await updateStatusMutation.mutateAsync({
      ticketId: selectedTicket.id,
      status: updateStatus,
      resolution: resolution || undefined,
    });
  };

  const handleOpenDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setResolution(ticket.resolution ? ticket.resolution : "");
    setIsDetailDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "待处理":
        return <AlertTriangle className="w-4 h-4" />;
      case "处理中":
        return <Clock className="w-4 h-4" />;
      case "已解决":
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const TicketList = ({ tickets, isLoading }: { tickets?: Ticket[]; isLoading: boolean }) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      );
    }

    if (!tickets || tickets.length === 0) {
      return <div className="text-center py-8 text-gray-500">暂无工单</div>;
    }

    return (
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleOpenDetail(ticket)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(ticket.status)}
                  <h3 className="font-semibold text-gray-900">{ticket.ticketNumber}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{ticket.title}</p>
                <p className="text-xs text-gray-500">
                  创建于: {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-blue-600">{ticket.status}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent),
                          linear-gradient(90deg, transparent 24%, rgba(0, 0, 255, 0.05) 25%, rgba(0, 0, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(0, 0, 255, 0.05) 75%, rgba(0, 0, 255, 0.05) 76%, transparent 77%, transparent)`,
        backgroundSize: "50px 50px",
      }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">工单管理</h1>
          <p className="text-gray-600">管理和处理客户工单</p>
        </div>

        {/* 统计卡片 */}
        {ticketStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 bg-white border-l-4 border-l-red-500">
              <p className="text-gray-600 text-sm">待处理</p>
              <p className="text-3xl font-bold text-red-600">{ticketStats.pending}</p>
            </Card>
            <Card className="p-4 bg-white border-l-4 border-l-yellow-500">
              <p className="text-gray-600 text-sm">处理中</p>
              <p className="text-3xl font-bold text-yellow-600">{ticketStats.processing}</p>
            </Card>
            <Card className="p-4 bg-white border-l-4 border-l-green-500">
              <p className="text-gray-600 text-sm">已解决</p>
              <p className="text-3xl font-bold text-green-600">{ticketStats.resolved}</p>
            </Card>
            <Card className="p-4 bg-white border-l-4 border-l-blue-500">
              <p className="text-gray-600 text-sm">总计</p>
              <p className="text-3xl font-bold text-blue-600">{ticketStats.total}</p>
            </Card>
          </div>
        )}

        {/* 工单标签页 */}
        <Card className="bg-white">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full border-b rounded-none bg-transparent p-4">
              <TabsTrigger value="pending" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                待处理 ({pendingTickets?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="processing" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                处理中 ({processingTickets?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600">
                已解决 ({resolvedTickets?.length || 0})
              </TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="pending">
                <TicketList tickets={pendingTickets} isLoading={pendingLoading} />
              </TabsContent>
              <TabsContent value="processing">
                <TicketList tickets={processingTickets} isLoading={processingLoading} />
              </TabsContent>
              <TabsContent value="resolved">
                <TicketList tickets={resolvedTickets} isLoading={resolvedLoading} />
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>

      {/* 工单详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>工单详情: {selectedTicket?.ticketNumber}</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">标题</label>
                <p className="text-gray-900 mt-1">{selectedTicket.title}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">描述</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {selectedTicket.context && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">上下文信息</label>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-48">
                    {JSON.stringify(selectedTicket.context, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">优先级</label>
                  <p className="text-gray-900 mt-1 capitalize">{selectedTicket.priority}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">当前状态</label>
                  <p className="text-gray-900 mt-1">{selectedTicket.status}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">更新状态</label>
                <Select value={updateStatus || ""} onValueChange={(value) => setUpdateStatus(value as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="待处理">待处理</SelectItem>
                    <SelectItem value="处理中">处理中</SelectItem>
                    <SelectItem value="已解决">已解决</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">解决方案</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="输入解决方案..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
