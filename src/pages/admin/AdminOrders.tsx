import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Download, MessageSquare, Trash2, Eye, Truck, Edit2, Save, X, Package, User, Phone, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AdminLayout } from '../../components/AdminLayout';
import { orderAPI } from '../../services/api';
import { toast } from 'sonner';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  store_number: string;
  total_amount: number;
  status: string;
  verification_code: string;
  is_verified: boolean;
  telegram_sent: boolean;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
  items?: any[];
}

interface OrderItem {
  id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  flavors: string[];
  subtotal: number;
  is_upsell: boolean;
}

interface OrderDetail extends Order {
  items: OrderItem[];
}

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTracking, setEditingTracking] = useState<{ [key: number]: boolean }>({});
  const [trackingInputs, setTrackingInputs] = useState<{ [key: number]: string }>({});
  const [savingTracking, setSavingTracking] = useState<{ [key: number]: boolean }>({});

  // 訂單詳情模態框狀態
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [currentPage, statusFilter, searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined
      };
      
      const response = await orderAPI.getAllAdmin(params);
      if (response.data.success) {
        setOrders(response.data.data.orders || []);
        setTotalPages(response.data.data.pagination?.total_pages || 1);
      } else {
        setError('載入訂單失敗');
      }
    } catch (error) {
      console.error('載入訂單失敗:', error);
      setError('載入訂單失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await orderAPI.updateStatus(orderId, newStatus);
      toast.success('訂單狀態更新成功');
      await loadOrders();
    } catch (error) {
      console.error('更新訂單狀態失敗:', error);
      toast.error('更新訂單狀態失敗');
    }
  };

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const handleExportOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error('請選擇要導出的訂單');
      return;
    }

    setExporting(true);
    try {
      const response = await orderAPI.exportExcel(selectedOrders);

      // 創建下載鏈接
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const filename = `DOC${year}${day}${month}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`成功導出 ${selectedOrders.length} 個訂單`);
      setSelectedOrders([]);
    } catch (error) {
      console.error('導出訂單失敗:', error);
      toast.error('導出訂單失敗');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteOrder = async (orderId: number, orderNumber: string) => {
    if (!confirm(`確定要刪除訂單「${orderNumber}」嗎？此操作無法撤銷。`)) {
      return;
    }

    try {
      await orderAPI.delete(orderId);
      toast.success('訂單已刪除');
      await loadOrders();
    } catch (error) {
      console.error('刪除訂單失敗:', error);
      toast.error('刪除訂單失敗');
    }
  };

  const handleBatchDeleteOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error('請選擇要刪除的訂單');
      return;
    }

    if (!confirm(`確定要刪除選中的 ${selectedOrders.length} 個訂單嗎？此操作無法撤銷。`)) {
      return;
    }

    setDeleting(true);
    try {
      await orderAPI.batchDelete(selectedOrders);
      toast.success(`成功刪除 ${selectedOrders.length} 個訂單`);
      setSelectedOrders([]);
      await loadOrders();
    } catch (error) {
      console.error('批量刪除訂單失敗:', error);
      toast.error('批量刪除訂單失敗');
    } finally {
      setDeleting(false);
    }
  };

  // 運輸單號相關函數
  const handleEditTracking = (orderId: number, currentTracking?: string) => {
    setEditingTracking(prev => ({ ...prev, [orderId]: true }));
    setTrackingInputs(prev => ({ ...prev, [orderId]: currentTracking || '' }));
  };

  const handleCancelEditTracking = (orderId: number) => {
    setEditingTracking(prev => ({ ...prev, [orderId]: false }));
    setTrackingInputs(prev => ({ ...prev, [orderId]: '' }));
  };

  const handleSaveTracking = async (orderId: number) => {
    const trackingNumber = trackingInputs[orderId]?.trim();
    
    if (!trackingNumber) {
      toast.error('請輸入運輸單號');
      return;
    }

    setSavingTracking(prev => ({ ...prev, [orderId]: true }));
    try {
      await orderAPI.updateTracking(orderId, trackingNumber);
      toast.success('運輸單號更新成功');
      setEditingTracking(prev => ({ ...prev, [orderId]: false }));
      setTrackingInputs(prev => ({ ...prev, [orderId]: '' }));
      await loadOrders(); // 重新加載訂單列表
    } catch (error) {
      console.error('更新運輸單號失敗:', error);
      toast.error('更新運輸單號失敗');
    } finally {
      setSavingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleTrackingInputChange = (orderId: number, value: string) => {
    setTrackingInputs(prev => ({ ...prev, [orderId]: value }));
  };

  const canShowTracking = (status: string) => {
    return status === 'shipped' || status === 'delivered';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-vape-purple/10 text-vape-purple';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待確認';
      case 'confirmed':
        return '已確認';
      case 'processing':
        return '處理中';
      case 'shipped':
        return '已出貨';
      case 'delivered':
        return '已送達';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  // 查看訂單詳情
  const handleViewOrderDetail = async (orderId: number) => {
    setLoadingOrderDetail(true);
    try {
      const response = await orderAPI.getById(orderId);
      if (response.data.success) {
        setSelectedOrderDetail(response.data.data);
        setShowOrderDetail(true);
      } else {
        toast.error('載入訂單詳情失敗');
      }
    } catch (error) {
      console.error('載入訂單詳情失敗:', error);
      toast.error('載入訂單詳情失敗');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vape-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadOrders}>重試</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCart className="h-8 w-8" />
              訂單管理
            </h1>
            <p className="text-gray-600 mt-2">管理所有訂單和訂單狀態</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleBatchDeleteOrders}
              disabled={selectedOrders.length === 0 || deleting}
              variant="outline"
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? '刪除中...' : `刪除訂單 (${selectedOrders.length})`}
            </Button>
            <Button
              onClick={handleExportOrders}
              disabled={selectedOrders.length === 0 || exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? '導出中...' : `導出訂單 (${selectedOrders.length})`}
            </Button>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總訂單數</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待處理</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'delivered').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總金額</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                NT$ {Math.round(orders.reduce((sum, o) => sum + o.total_amount, 0)).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和篩選 */}
        <Card>
          <CardHeader>
            <CardTitle>搜索和篩選</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="搜索訂單號、客戶姓名或電話..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有狀態</SelectItem>
                  <SelectItem value="pending">待確認</SelectItem>
                  <SelectItem value="confirmed">已確認</SelectItem>
                  <SelectItem value="processing">處理中</SelectItem>
                  <SelectItem value="shipped">已出貨</SelectItem>
                  <SelectItem value="delivered">已送達</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 批量操作 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">
                  全選 ({selectedOrders.length}/{orders.length})
                </span>
              </div>

              {selectedOrders.length > 0 && (
                <div className="text-sm text-blue-600">
                  已選擇 {selectedOrders.length} 個訂單
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 訂單列表 */}
        <Card>
          <CardHeader>
            <CardTitle>訂單列表</CardTitle>
            <CardDescription>管理所有訂單信息和狀態</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暫無訂單數據
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded"
                        />
                        <h3 className="font-medium text-gray-900">{order.order_number}</h3>
                        <Badge className={getStatusBadgeColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        {order.telegram_sent && (
                          <Badge variant="outline" className="text-green-600">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            已通知
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium text-gray-900">NT$ {order.total_amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('zh-TW')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">客戶:</span> {order.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">電話:</span> {order.customer_phone}
                      </div>
                      <div>
                        <span className="font-medium">店號:</span> {order.store_number}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                                          <div className="text-sm text-gray-500">
                      驗證碼: {order.verification_code} | 
                      已驗證: {order.is_verified ? '是' : '否'}
                    </div>
                    
                    {/* 運輸單號區域 */}
                    {canShowTracking(order.status) && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">運輸單號</span>
                        </div>
                        
                        {editingTracking[order.id] ? (
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="請輸入運輸單號"
                              value={trackingInputs[order.id] || ''}
                              onChange={(e) => handleTrackingInputChange(order.id, e.target.value)}
                              className="flex-1"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveTracking(order.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveTracking(order.id)}
                              disabled={savingTracking[order.id]}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {savingTracking[order.id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelEditTracking(order.id)}
                              disabled={savingTracking[order.id]}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono bg-white px-2 py-1 rounded border">
                              {order.tracking_number || '尚未提供'}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTracking(order.id, order.tracking_number)}
                              className="ml-2"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              {order.tracking_number ? '修改' : '添加'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                      
                      <div className="flex gap-2">
                        <Select 
                          value={order.status} 
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">待確認</SelectItem>
                            <SelectItem value="confirmed">已確認</SelectItem>
                            <SelectItem value="processing">處理中</SelectItem>
                            <SelectItem value="shipped">已出貨</SelectItem>
                            <SelectItem value="delivered">已送達</SelectItem>
                            <SelectItem value="cancelled">已取消</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id, order.order_number)}
                          className="text-red-600 hover:text-red-700"
                          title="刪除訂單"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrderDetail(order.id)}
                          disabled={loadingOrderDetail}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          查看詳情
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 訂單詳情模態框 */}
        {showOrderDetail && selectedOrderDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="h-6 w-6" />
                    訂單詳情
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOrderDetail(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 訂單基本信息 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        基本信息
                      </span>
                      <Badge className={getStatusBadgeColor(selectedOrderDetail.status)}>
                        {getStatusText(selectedOrderDetail.status)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">訂單號</p>
                        <p className="font-medium">{selectedOrderDetail.order_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">下單時間</p>
                        <p className="font-medium">{formatDate(selectedOrderDetail.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">客戶姓名</p>
                        <p className="font-medium">{selectedOrderDetail.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">聯絡電話</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {selectedOrderDetail.customer_phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">取貨門市</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {selectedOrderDetail.store_number}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">訂單總額</p>
                        <p className="font-medium text-lg flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          NT$ {selectedOrderDetail.total_amount.toLocaleString()}
                        </p>
                      </div>
                      {selectedOrderDetail.tracking_number && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-600">運輸單號</p>
                          <p className="font-medium flex items-center gap-1">
                            <Truck className="w-4 h-4" />
                            {selectedOrderDetail.tracking_number}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 訂單商品 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      訂單商品
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedOrderDetail.items?.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                              {item.flavors && item.flavors.length > 0 && (
                                <p className="text-sm text-gray-600 mt-1">
                                  規格: {item.flavors.join(', ')}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span>單價: NT$ {item.product_price}</span>
                                <span>數量: {item.quantity}</span>
                                {item.is_upsell && (
                                  <Badge variant="outline" className="text-xs">
                                    加購商品
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-lg">
                                NT$ {item.subtotal.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
