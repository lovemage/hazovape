import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Copy, ShoppingBag, Calendar, MapPin, Phone, User, MessageCircle, Search, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Order, CustomerInfo } from '../types';
import { toast } from 'sonner';
import api, { settingsAPI } from '../services/api';

export const OrderConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const order = location.state?.order as Order;
  const customerInfo = location.state?.customerInfo as CustomerInfo;
  
  // 從 URL 參數中獲取訂單號
  const urlParams = new URLSearchParams(location.search);
  const orderNumberFromUrl = urlParams.get('orderNumber');
  
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [popupImage, setPopupImage] = useState<string>('/uploads/static/unlock-popup.png');
  const [popupEnabled, setPopupEnabled] = useState<boolean>(true);
  const [lineUrl, setLineUrl] = useState<string>('https://line.me/ti/p/@590shgcm');
  const [telegramUrl, setTelegramUrl] = useState<string>('https://t.me/whalesale');

  useEffect(() => {
    loadSettings();
    
    // 顯示廣告彈窗，延遲1.5秒以確保設置載入完成
    const timer = setTimeout(() => {
      if (popupEnabled) {
        setShowAdPopup(true);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [popupEnabled]);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.getAll();
      if (response.data.success && response.data.data) {
        const settings = response.data.data;
        if (settings.order_complete_popup_image) {
          setPopupImage(settings.order_complete_popup_image);
        }
        if (settings.order_complete_popup_enabled !== undefined) {
          const enabled = settings.order_complete_popup_enabled === 'true' || settings.order_complete_popup_enabled === true;
          setPopupEnabled(enabled);
        }
        if (settings.contact_line) {
          setLineUrl(settings.contact_line);
        }
        if (settings.contact_telegram) {
          setTelegramUrl(settings.contact_telegram);
        }
      }
    } catch (error) {
      console.error('載入設置失敗:', error);
    }
  };

  if (!order) {
    // 如果有 URL 中的訂單號，自動跳轉到查詢頁面並預填訂單號
    if (orderNumberFromUrl) {
      navigate('/order-query', {
        state: {
          prefilledOrderNumber: orderNumberFromUrl
        }
      });
      return null;
    }
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">訂單信息不存在</p>
          <p className="text-gray-600 mb-6">
            如果您剛完成下單，請使用訂單查詢功能查看您的訂單詳情
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/order-query')}
              className="bg-blue-600 hover:bg-blue-700 text-white mr-3"
            >
              查詢訂單
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
            >
              返回首頁
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label}已複製到剪貼簿`);
    }).catch(() => {
      toast.error('複製失敗');
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'confirmed':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 廣告彈窗 */}
      {showAdPopup && popupEnabled && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto relative overflow-hidden">
            {/* 關閉按鈕 */}
            <button
              onClick={() => setShowAdPopup(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            {/* 廣告圖片 */}
            <div className="w-full">
              <img
                src={popupImage}
                                  alt="MeelFul Unlock 廣告"
                className="w-full h-auto object-cover rounded-t-2xl"
                onError={(e) => {
                  console.error('廣告圖片載入失敗');
                  const target = e.target as HTMLImageElement;
                  // 如果自定義圖片載入失敗，嘗試使用默認圖片
                              if (target.src !== '/uploads/static/unlock-popup.png') {
              target.src = '/uploads/static/unlock-popup.png';
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            </div>

            {/* 按鈕區域 */}
            <div className="p-6">
              <div className="flex gap-4 justify-center">
                {/* Line 按鈕 - Pixel 3D 風格 */}
                <button
                  onClick={() => {
                    window.open(lineUrl, '_blank');
                    setShowAdPopup(false);
                  }}
                  className="pixel-button pixel-button-green flex items-center justify-center gap-2 px-6 py-3 text-white font-bold text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.630-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.630.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12.017.572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  LINE
                </button>

                {/* Telegram 按鈕 - Pixel 3D 風格 */}
                <button
                  onClick={() => {
                    window.open(telegramUrl, '_blank');
                    setShowAdPopup(false);
                  }}
                  className="pixel-button pixel-button-blue flex items-center justify-center gap-2 px-6 py-3 text-white font-bold text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.180 1.896-.962 6.502-.962 6.502-.759 1.815-1.31 2.122-2.17 2.122-.92 0-1.518-.34-1.518-1.31v-7.956L8.078 8.698c-1.434-.679-1.59-1.773-.31-2.122l9.542-3.677c1.43-.552 2.624.273 2.258 2.261z"/>
                  </svg>
                  Telegram
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 成功提示區域 */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">訂單提交成功！</h1>
          <p className="text-green-100">
            感謝您的訂購，我們將盡快為您處理訂單
          </p>
        </div>
      </div>

      {/* 主要內容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 訂單詳情 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 訂單基本信息 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">訂單信息</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    訂單號
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-semibold text-blue-600">
                      {order.order_number}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(order.order_number, '訂單號')}
                      className="p-1"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    訂單狀態
                  </label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    下單時間
                  </label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    總金額
                  </label>
                  <span className="text-xl font-bold text-green-600">
                    NT$ {Math.round(order.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 驗證碼（如果有的話） */}
              {order.verification_code && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    驗證碼
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold text-blue-600">
                      {order.verification_code}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(order.verification_code!, '驗證碼')}
                      className="p-1"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    請保存此驗證碼，用於查詢訂單狀態
                  </p>
                </div>
              )}
            </div>

            {/* 收件信息 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">收件信息</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500">收件人：</span>
                    <span className="font-medium text-gray-900">{order.customer_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500">電話：</span>
                    <span className="font-medium text-gray-900">{order.customer_phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500">取貨門市：</span>
                    <span className="font-medium text-gray-900">7-11 {order.store_number}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 訂單商品 */}
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">訂單商品</h3>
                
                <div className="space-y-4">
                  {order.items.map((item, index) => {
                    const flavors = typeof item.flavors === 'string' 
                      ? JSON.parse(item.flavors) 
                      : item.flavors;
                    
                    return (
                      <div key={index} className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.productName}</h4>
                          <p className="text-sm text-gray-600">
                            數量: {item.quantity} × NT$ {Math.round(item.product_price || 0).toLocaleString()}
                          </p>
                          {flavors && flavors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">口味:</p>
                              <div className="flex flex-wrap gap-1">
                                {flavors.map((flavor: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                  >
                                    {flavor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            NT$ {Math.round(item.subtotal).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 側邊欄 - 下一步說明 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">接下來該做什麼？</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">等待確認</p>
                    <p className="text-sm text-gray-600">我們將在24小時內確認您的訂單</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">商品配送</p>
                    <p className="text-sm text-gray-600">確認後3-5個工作天內送達指定門市</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">到店取貨</p>
                    <p className="text-sm text-gray-600">收到取貨通知後請盡快到門市取貨</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>提醒：</strong>請保存好您的訂單號和驗證碼，用於查詢訂單狀態和取貨時使用。
                </p>
              </div>

              {/* Telegram 客服聯繫 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-blue-900">需要協助？</p>
                </div>
                <p className="text-sm text-blue-800 mb-3">
                  如有任何問題，請聯繫我們的 Telegram 客服
                </p>
                <Button
                  onClick={() => window.open(telegramUrl, '_blank')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  聯繫 Telegram 客服
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => navigate('/order-query')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Search className="w-4 h-4 mr-2" />
                  查詢訂單狀態
                </Button>

                <Button
                  onClick={() => navigate('/')}
                  className="w-full"
                  variant="outline"
                >
                  返回首頁
                </Button>

                <Button
                  onClick={() => navigate('/products')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  繼續購物
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
