import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { AdminLayout } from '../../components/AdminLayout';
import { adminAPI, orderAPI } from '../../services/api';
import { DashboardStats, Order } from '../../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 載入儀表板數據...');
      const response = await adminAPI.getDashboard();
      console.log('📦 儀表板 API 響應:', response.data);

      if (response.data.success) {
        const backendData = response.data.data;
        console.log('✅ 後端數據:', backendData);

        // 轉換後端數據格式為前端期望的格式
        const transformedStats: DashboardStats = {
          totalOrders: Number(backendData.statistics?.orders?.total) || 0,
          totalRevenue: Number(backendData.statistics?.revenue?.total) || 0,
          todayOrders: Number(backendData.statistics?.orders?.today) || 0,
          todayRevenue: 0, // 後端沒有提供今日營收，暫時設為0
          monthlyOrders: 0, // 後端沒有提供月度訂單，暫時設為0
          monthlyRevenue: 0, // 後端沒有提供月度營收，暫時設為0
          topProducts: Array.isArray(backendData.charts?.popular_products) ? backendData.charts.popular_products : [],
          recentOrders: Array.isArray(backendData.latest_orders) ? backendData.latest_orders : [],
          ordersByStatus: {
            pending: Number(backendData.statistics?.orders?.pending) || 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0
          },
          salesTrend: Array.isArray(backendData.charts?.recent_orders) ? backendData.charts.recent_orders : []
        };
        console.log('🎯 轉換後的統計數據:', transformedStats);
        setStats(transformedStats);
      } else {
        console.error('❌ API 返回失敗:', response.data);
        setError(response.data.message || '載入儀表板數據失敗');
      }
    } catch (error: any) {
      console.error('❌ 載入儀表板數據失敗:', error);
      const errorMessage = error.response?.data?.message || error.message || '載入儀表板數據失敗';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-vape-purple/10 text-vape-purple';
      case 'completed':
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
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
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

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadDashboardData}>重試</Button>
        </div>
      </AdminLayout>
    );
  }

  // 準備圖表數據
  const orderStatusData = stats.ordersByStatus ? Object.entries(stats.ordersByStatus).map(([status, count]) => ({
    name: getStatusText(status),
    value: Number(count) || 0,
    status
  })).filter(item => item.value > 0) : [];

  const topProductsData = stats.topProducts ? stats.topProducts.map(product => ({
    name: product.product_name && product.product_name.length > 10
      ? product.product_name.substring(0, 10) + '...'
      : product.product_name || '未知商品',
    销量: Number(product.total_quantity) || 0,
    营收: Number(product.total_revenue) || 0
  })) : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">儀表板</h1>
          <p className="text-gray-600 mt-2">歡迎回來！這裡是您的業務概覽</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 總訂單數 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總訂單數</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                今日新增 {stats.todayOrders} 筆
              </p>
            </CardContent>
          </Card>

          {/* 總營收 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總營收</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">NT$ {stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                今日 NT$ {stats.todayRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* 本月訂單 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月訂單</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyOrders}</div>
              <p className="text-xs text-muted-foreground">
                營收 NT$ {stats.monthlyRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* 平均訂單價值 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均訂單價值</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                NT$ {stats.totalOrders > 0 && stats.totalRevenue > 0
                  ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString()
                  : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                基於所有訂單計算
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 圖表區域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 熱銷商品 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                熱銷商品
              </CardTitle>
              <CardDescription>按銷量排序的前5名商品</CardDescription>
            </CardHeader>
            <CardContent>
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProductsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="销量" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* 訂單狀態分布 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                訂單狀態分布
              </CardTitle>
              <CardDescription>當前所有訂單的狀態統計</CardDescription>
            </CardHeader>
            <CardContent>
              {orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  暂无数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 近期訂單 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              近期訂單
            </CardTitle>
            <CardDescription>最近的10筆訂單</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusBadgeColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          NT$ {Number(order.total_amount).toLocaleString() || '0'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('zh-TW')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暫無近期訂單
              </div>
            )}
          </CardContent>
        </Card>

        {/* 銷售趨勢 */}
        {stats.salesTrend && stats.salesTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                銷售趨勢
              </CardTitle>
              <CardDescription>過去7天的銷售數據</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} name="訂單數" />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="營收" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};
