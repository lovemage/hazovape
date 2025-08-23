import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, XCircle, Truck, MapPin, MessageCircle, AlertTriangle, ShoppingBag, Settings, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { orderAPI, settingsAPI } from '../services/api';
import { toast } from 'sonner';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { useCart } from '../contexts/CartContext';

interface OrderItem {
  id: number;
  product_name: string;
  product_price: number;
  quantity: number;
  flavors: string[];
  subtotal: number;
  is_upsell: boolean;
}

interface OrderData {
  order_number: string;
  customer_name: string;
  customer_phone: string;
  store_number: string;
  total_amount: number;
  status: string;
  status_text: string;
  is_verified: boolean;
  tracking_number?: string;
  created_at: string;
  items: OrderItem[];
}

const OrderQueryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useCart();
  const items = state.items;
  
  // 檢查是否有預填的訂單號
  const prefilledOrderNumber = location.state?.prefilledOrderNumber;
  
  const [orderNumber, setOrderNumber] = useState(prefilledOrderNumber || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState<string>('t.me/edward0521');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (response.data.success && response.data.data) {
        const settings = response.data.data;
        if (settings.contact_telegram) {
          setTelegramUrl(settings.contact_telegram);
        }
      }
    } catch (error) {
      console.error('載入設置失敗:', error);
    }
  };

  const handleCopyTracking = async (trackingNumber: string) => {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      toast.success('運輸單號已複製到剪貼板');
    } catch (error) {
      console.error('複製失敗:', error);
      toast.error('複製失敗');
    }
  };

  const handleQuery = async () => {
    if (!orderNumber.trim() || !verificationCode.trim()) {
      toast.error('請輸入訂單號和驗證碼');
      return;
    }

    setLoading(true);
    try {
      const response = await orderAPI.query(orderNumber.trim(), verificationCode.trim());
      
      if (response.data.success) {
        setOrderData(response.data.data);
        toast.success('查詢成功');
      } else {
        toast.error(response.data.message || '查詢失敗');
        setOrderData(null);
      }
    } catch (error: any) {
      console.error('查詢訂單失敗:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('查詢失敗，請檢查訂單號和驗證碼');
      }
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-vape-purple" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-purple-500" />;
      case 'delivered':
        return <MapPin className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'confirmed':
        return 'bg-vape-purple/10 text-vape-purple border-vape-purple/20';
      case 'shipped':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 導航列 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <img 
                src="/hazo-png.png" 
                alt="Hazo Logo" 
                className="w-10 h-10 mr-3 group-hover:scale-105 transition-transform rounded-md object-cover"
              />
              <h1 className="text-xl font-bold bg-gradient-to-r from-meelful-primary to-meelful-secondary bg-clip-text text-transparent">
                Hazo
              </h1>
            </div>

            {/* 右側按鈕組 */}
            <div className="flex items-center gap-3">
              {/* 聯繫客服按鈕 */}
              <Button
                onClick={() => window.open(telegramUrl, '_blank')}
                variant="ghost"
                size="sm"
                className="text-vape-cyan hover:bg-vape-cyan/10 hover:text-vape-cyan"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                客服
              </Button>

              {/* 購物車按鈕 */}
              <Button
                onClick={() => navigate('/checkout')}
                variant="ghost"
                size="sm"
                className="relative text-gray-600 hover:bg-gray-50 hover:text-gray-700"
              >
                <ShoppingBag className="w-4 h-4 mr-1" />
                購物車
                {state.items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {state.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </Button>

              {/* 商品頁面按鈕 */}
              <Button
                onClick={() => navigate('/products')}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-700"
              >
                <Package className="w-4 h-4 mr-1" />
                商品
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">訂單查詢</h1>
          <p className="text-gray-600">請輸入您的訂單號和驗證碼查詢訂單狀態</p>
        </div>

        {/* 免責聲明 */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-2">重要提醒</p>
                <p className="leading-relaxed">
                  此查詢頁面並非絕對貨態查詢，因商品寄出和系統非同步進行，您訂購的商品可能已經安排出貨，但是系統尚未更新狀態。此頁面僅供參考，如要正確貨態查詢可以與客服人員聯繫。
                </p>
                <div className="mt-3">
                  <Button
                    onClick={() => window.open(telegramUrl, '_blank')}
                    className="bg-gradient-to-r from-vape-purple to-vape-cyan hover:from-purple-700 hover:to-cyan-600 text-white"
                    size="sm"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    聯繫 Telegram 客服
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 查詢表單 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              查詢訂單
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNumber">訂單號</Label>
                <Input
                  id="orderNumber"
                  type="text"
                  placeholder="請輸入訂單號"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="verificationCode">驗證碼</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="請輸入驗證碼"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button 
              onClick={handleQuery} 
              disabled={loading}
              className="w-full"
            >
              {loading ? '查詢中...' : '查詢訂單'}
            </Button>
          </CardContent>
        </Card>

        {/* 訂單詳情 */}
        {orderData && (
          <div className="space-y-6">
            {/* 訂單基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    訂單詳情
                  </span>
                  <Badge className={`${getStatusColor(orderData.status)} border`}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(orderData.status)}
                      {orderData.status_text}
                    </span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">訂單號</p>
                    <p className="font-medium">{orderData.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">下單時間</p>
                    <p className="font-medium">{formatDate(orderData.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">客戶姓名</p>
                    <p className="font-medium">{orderData.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">聯絡電話</p>
                    <p className="font-medium">{orderData.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">取貨門市</p>
                    <p className="font-medium">{orderData.store_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">訂單總額</p>
                    <p className="font-medium text-lg text-vape-purple">
                      NT$ {orderData.total_amount.toLocaleString()}
                    </p>
                  </div>
                  
                  {/* 運輸單號顯示 */}
                  {(orderData.status === 'shipped' || orderData.status === 'delivered') && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">運輸單號</p>
                                             {orderData.tracking_number ? (
                         <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="font-mono bg-vape-purple/10 px-3 py-1 rounded border border-vape-purple/20 text-vape-purple">
                               {orderData.tracking_number}
                             </span>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleCopyTracking(orderData.tracking_number!)}
                               className="text-vape-cyan hover:text-vape-purple"
                             >
                               <Copy className="w-3 h-3 mr-1" />
                               複製
                             </Button>
                           </div>
                           <div className="flex items-center gap-2">
                             <Button
                               size="sm"
                               onClick={() => window.open('https://eservice.7-11.com.tw/e-tracking/search.aspx', '_blank')}
                               className="bg-green-600 hover:bg-green-700 text-white"
                             >
                               <ExternalLink className="w-3 h-3 mr-1" />
                               立刻查詢
                             </Button>
                             <span className="text-xs text-gray-500">前往7-11電子取貨查詢系統</span>
                           </div>
                         </div>
                       ) : (
                         <p className="text-sm text-gray-500 mt-1">尚未提供運輸單號</p>
                       )}
                    </div>
                  )}
                </div>
                
                {orderData.is_verified && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">此訂單已驗證</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 商品清單 */}
            <Card>
              <CardHeader>
                <CardTitle>商品清單</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.items.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-start p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          {item.is_upsell && (
                            <Badge variant="secondary" className="text-xs">
                              加購商品
                            </Badge>
                          )}
                        </div>
                        {item.flavors.length > 0 && (
                          <p className="text-sm text-gray-600 mb-1">
                            規格: {item.flavors.join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          單價: NT$ {item.product_price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          NT$ {item.subtotal.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Telegram 客服聯繫 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-5 h-5 text-vape-cyan" />
                  <p className="font-medium text-vape-dark">需要協助？</p>
                </div>
                <p className="text-sm text-vape-dark/80 mb-3">
                  如有任何問題或需要最新的貨態查詢，請聯繫我們的 Telegram 客服
                </p>
                <Button
                  onClick={() => window.open(telegramUrl, '_blank')}
                  className="w-full bg-gradient-to-r from-vape-purple to-vape-cyan hover:from-purple-700 hover:to-cyan-600 text-white"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  聯繫 Telegram 客服
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
      
      {/* 懸浮聯繫按鈕 */}
      <FloatingContactButtons />
      
      {/* 移動端底部導航的佔位空間 */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default OrderQueryPage;
