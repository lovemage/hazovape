import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, User, Phone, MapPin, CreditCard, Search, ExternalLink, Copy, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useCart } from '../contexts/CartContext';
import { orderAPI, couponAPI } from '../services/api';
import { CustomerInfo, CouponValidationResult } from '../types';
import { toast } from 'sonner';
import { UpsellSection } from '../components/UpsellSection';
import { StoreSelector } from '../components/StoreSelector';
import { OrderItem } from '../types';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, clearCart, getTotalPrice } = useCart();
  const items = state.items;
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    storeNumber: '',
    storeName: '',
    notes: ''
  });

  const [freeShippingThreshold, setFreeShippingThreshold] = useState(3000); // 默認3000免運
  const [shippingFee, setShippingFee] = useState(60); // 默認60元運費
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  // 優惠券相關狀態
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // 複製店號功能
  const handleCopyStoreNumber = async (storeNumber: string) => {
    try {
      await navigator.clipboard.writeText(storeNumber);
      toast.success('店號已複製到剪貼板');
    } catch (error) {
      console.error('複製失敗:', error);
      toast.error('複製失敗');
    }
  };

  // 處理門市選擇
  const handleStoreSelect = (store: { id: string; name: string; tel: string; address: string }) => {
    setCustomerInfo(prev => ({
      ...prev,
      storeNumber: store.id,
      storeName: store.name
    }));
  };

  // 驗證優惠券
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('請輸入優惠券代碼');
      return;
    }

    if (!customerInfo.phone) {
      toast.error('請先填寫電話號碼');
      return;
    }

    try {
      setCouponLoading(true);
      const response = await couponAPI.validate({
        code: couponCode.trim(),
        customerPhone: customerInfo.phone,
        subtotal: getTotalPrice()
      });

      if (response.data.success) {
        setAppliedCoupon(response.data.data);
        toast.success(response.data.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('驗證優惠券失敗:', error);
      toast.error('驗證優惠券失敗');
    } finally {
      setCouponLoading(false);
    }
  };

  // 移除優惠券
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('已移除優惠券');
  };

  // 重新驗證已套用的優惠券
  const revalidateAppliedCoupon = useCallback(async () => {
    if (!appliedCoupon || !customerInfo.phone) {
      return;
    }

    const originalDiscountAmount = appliedCoupon.discountAmount;

    try {
      const response = await couponAPI.validate({
        code: appliedCoupon.coupon.code,
        customerPhone: customerInfo.phone,
        subtotal: getTotalPrice()
      });

      if (response.data.success) {
        const newDiscountAmount = response.data.data.discountAmount;
        
        // 更新優惠券折扣金額
        setAppliedCoupon(response.data.data);
        
        // 如果折扣金額發生變化，提醒用戶
        if (originalDiscountAmount !== newDiscountAmount) {
          if (newDiscountAmount > originalDiscountAmount) {
            toast.success(`優惠券折扣已更新：NT$ ${newDiscountAmount.toLocaleString()}（+NT$ ${(newDiscountAmount - originalDiscountAmount).toLocaleString()}）`);
          } else if (newDiscountAmount < originalDiscountAmount) {
            toast.warning(`優惠券折扣已更新：NT$ ${newDiscountAmount.toLocaleString()}（-NT$ ${(originalDiscountAmount - newDiscountAmount).toLocaleString()}）`);
          }
        }
        
        console.log('✅ 優惠券已重新驗證，折扣已更新:', newDiscountAmount);
      } else {
        // 優惠券不再有效，移除它
        setAppliedCoupon(null);
        setCouponCode('');
        toast.error(`優惠券已失效：${response.data.message}`);
      }
    } catch (error) {
      console.error('重新驗證優惠券失敗:', error);
      // 發生錯誤時保持現有優惠券，避免意外移除
    }
  }, [appliedCoupon, customerInfo.phone, getTotalPrice]);

  // 計算優惠信息
  const getDiscountInfo = () => {
    const discountInfo: Array<{
      productName: string;
      quantity: number;
      originalPrice: number;
      discountedPrice: number;
      savings: number;
      discountType: 'quantity_discount' | 'item_discount' | 'unknown';
      discountDisplay: string;
    }> = [];

    // 移除舊的折扣計算邏輯

    return discountInfo;
  };

  const getTotalSavings = () => {
    return getDiscountInfo().reduce((total, info) => total + info.savings, 0);
  };

  // 計算優惠券折扣金額
  const getCouponDiscount = () => {
    return appliedCoupon ? appliedCoupon.discountAmount : 0;
  };

  // 計算運費
  const getShippingFee = () => {
    const subtotal = getTotalPrice();
    const afterDiscount = subtotal - getCouponDiscount();
    
    // 如果有免運優惠券，直接免運
    if (appliedCoupon && appliedCoupon.freeShipping) {
      return 0;
    }
    
    // 否則檢查折扣後是否達到免運門檻
    return afterDiscount >= freeShippingThreshold ? 0 : shippingFee;
  };

  // 計算最終總額（包含運費，扣除優惠券折扣）
  const getFinalTotal = () => {
    const subtotal = getTotalPrice();
    const discount = getCouponDiscount();
    const shipping = getShippingFee();
    return Math.max(0, subtotal - discount + shipping);
  };

  // 檢查是否符合免運（使用與getShippingFee相同的邏輯）
  const isFreeShipping = () => {
    const subtotal = getTotalPrice();
    const afterDiscount = subtotal - getCouponDiscount();
    
    // 如果有免運優惠券，直接免運
    if (appliedCoupon && appliedCoupon.freeShipping) {
      return true;
    }
    
    // 否則檢查折扣後是否達到免運門檻
    return afterDiscount >= freeShippingThreshold;
  };

  // 計算距離免運還差多少（基於折扣後金額）
  const getAmountToFreeShipping = () => {
    const subtotal = getTotalPrice();
    const afterDiscount = subtotal - getCouponDiscount();
    
    // 如果有免運優惠券，已經免運
    if (appliedCoupon && appliedCoupon.freeShipping) {
      return 0;
    }
    
    const remaining = freeShippingThreshold - afterDiscount;
    return remaining > 0 ? remaining : 0;
  };

  // 7-11門市查詢回調處理
  // 載入運費設置
  useEffect(() => {
    const loadShippingSettings = async () => {
      try {
        // 載入免運門檻
        const thresholdResponse = await fetch('/api/settings/free_shipping_threshold');
        if (thresholdResponse.ok) {
          const thresholdResult = await thresholdResponse.json();
          if (thresholdResult.success && thresholdResult.data.value) {
            setFreeShippingThreshold(parseInt(thresholdResult.data.value));
            console.log('✅ 免運門檻載入成功:', thresholdResult.data.value);
          }
        }

        // 載入運費金額
        const feeResponse = await fetch('/api/settings/shipping_fee');
        if (feeResponse.ok) {
          const feeResult = await feeResponse.json();
          if (feeResult.success && feeResult.data.value) {
            setShippingFee(parseInt(feeResult.data.value));
            console.log('✅ 運費金額載入成功:', feeResult.data.value);
          }
        }
      } catch (error) {
        console.error('❌ 載入運費設置失敗:', error);
      }
    };

    loadShippingSettings();
  }, []);

  // 監聽購物車變動，自動重新驗證優惠券
  useEffect(() => {
    if (appliedCoupon && customerInfo.phone && items.length > 0) {
      console.log('🛒 購物車變動，重新驗證優惠券...');
      revalidateAppliedCoupon();
    }
  }, [items, customerInfo.phone]); // 監聽購物車商品和客戶電話變化

  useEffect(() => {
    const handleStoreCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const storeName = urlParams.get('storeName');
      const storeId = urlParams.get('storeId');
      const storeAddress = urlParams.get('storeAddress');

      // 也檢查其他可能的參數名稱
      const CVSStoreName = urlParams.get('CVSStoreName');
      const CVSStoreID = urlParams.get('CVSStoreID');
      const CVSAddress = urlParams.get('CVSAddress');

      const finalStoreName = storeName || CVSStoreName;
      const finalStoreId = storeId || CVSStoreID;
      const finalStoreAddress = storeAddress || CVSAddress;

      console.log('🔍 檢查門市回調參數:', {
        storeName: finalStoreName,
        storeId: finalStoreId,
        storeAddress: finalStoreAddress,
        allParams: Object.fromEntries(urlParams.entries())
      });

      if (finalStoreName && finalStoreId) {
        setCustomerInfo(prev => ({
          ...prev,
          storeNumber: finalStoreId,
          storeName: finalStoreName
        }));

        toast.success('門市選擇成功', {
          description: `已選擇：${finalStoreName} (${finalStoreId})`,
          duration: 3000
        });

        // 清除URL參數
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        console.log('✅ 門市信息已更新:', {
          storeName: finalStoreName,
          storeNumber: finalStoreId,
          storeAddress: finalStoreAddress
        });
      }
    };

    handleStoreCallback();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!customerInfo.name.trim()) {
      newErrors.name = '請輸入姓名';
    }

    if (!customerInfo.phone.trim()) {
      newErrors.phone = '請輸入電話號碼';
    } else if (!/^09\d{8}$/.test(customerInfo.phone.trim())) {
      newErrors.phone = '請輸入正確的手機號碼格式（09xxxxxxxx）';
    }

    if (!customerInfo.storeNumber.trim() && !customerInfo.storeName.trim()) {
      newErrors.storeNumber = '請選擇7-11門市、輸入店號或店名';
    } else if (customerInfo.storeNumber.trim() && !/^\d{6}$/.test(customerInfo.storeNumber.trim())) {
      newErrors.storeNumber = '7-11店號應為6位數字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    // 檢查是否包含 | 符號（來自7-11回傳）
    if (field === 'storeName' && value.includes('|')) {
      value = value.replace('|', '');
    }

    setCustomerInfo(prev => ({ ...prev, [field]: value }));
    // 清除該欄位的錯誤
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 7-11門市選擇功能
  const openStoreSelector = () => {
    const { name, phone } = customerInfo;

    // 準備傳遞給7-11的資料
    const data = [
      name || '',
      phone || '',
      '', // lineId
      '', // memo
      '13663', // id
      '', // accessToken
      '', // bonusCode
      '', // source
      '' // lineSource
    ].join('|');

    // 根據設備類型選擇URL
    const isMobile = window.innerWidth < 768;
    const baseUrl = isMobile
      ? "https://emap.presco.com.tw/c2cemapm-u.ashx"
      : "https://emap.presco.com.tw/c2cemap.ashx";

    // 直接回調到結帳頁面
    const callbackUrl = encodeURIComponent(window.location.origin + '/checkout');
    const url = `${baseUrl}?eshopid=870&servicetype=1&tempvar=${data}&url=${callbackUrl}`;

    console.log('🗺️ 開啟 7-11 門市選擇器:', {
      baseUrl,
      callbackUrl: window.location.origin + '/checkout',
      fullUrl: url,
      isMobile
    });

    // 開啟7-11門市查詢頁面（使用與成功版本相同的方式）
    window.open(url, '_blank', 'width=800,height=600');

    toast.info('已開啟 7-11 門市選擇器', {
      description: '請在地圖上選擇您要取貨的門市，選擇完成後會自動返回此頁面',
      duration: 5000
    });
  };

  const handleStoreSearch = () => {
    // 開啟 7-11 店號查詢視窗（備用方案）
    const searchUrl = 'https://www.ibon.com.tw/mobile/retail_inquiry.aspx#gsc.tab=0';
    const windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';

    console.log('🔍 開啟 7-11 店號查詢視窗');

    const searchWindow = window.open(searchUrl, '7-11店號查詢', windowFeatures);

    if (searchWindow) {
      searchWindow.focus();
      toast.info('已開啟 7-11 門市查詢視窗', {
        duration: 8000,
        description: '1. 在 ibon 門市查詢系統中搜尋門市\n2. 記下門市的6位數店號\n3. 關閉查詢視窗後，將店號輸入到下方欄位中',
      });
    } else {
      toast.error('無法開啟查詢視窗', {
        description: '您的瀏覽器可能阻擋了彈出視窗，請允許彈出視窗或點擊下方按鈕直接前往',
        action: {
          label: '直接前往',
          onClick: () => window.open(searchUrl, '_blank')
        }
      });
    }
  };

  const discountInfo: Array<{
    productName: string;
    quantity: number;
    originalPrice: number;
    discountedPrice: number;
    savings: number;
    discountType: 'quantity_discount' | 'item_discount' | 'unknown';
    discountDisplay: string;
  }> = [];

  const orderItems: OrderItem[] = [];

  items.forEach(item => {
    if (item.variants && item.variants.length > 0) {
      // 對於有規格的商品，每個規格作為單獨的訂單項目
      item.variants.forEach(variant => {
        orderItems.push({
          product_id: item.productId,
          productName: item.productName,
          product_price: variant.price, // 使用規格的價格
          quantity: variant.quantity || 1, // 每個規格的數量，通常是1
          flavors: [variant.name], // 單個規格名稱
          subtotal: variant.price * (variant.quantity || 1),
          is_upsell: item.productName.startsWith('[加購]')
        });
      });
    } else {
      // 對於無規格的商品，使用原有邏輯
      orderItems.push({
        product_id: item.productId,
        productName: item.productName,
        product_price: item.productPrice,
        quantity: item.quantity,
        flavors: [],
        subtotal: item.subtotal,
        is_upsell: item.productName.startsWith('[加購]')
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('購物車是空的');
      return;
    }

    // 檢查必填字段
    if (!customerInfo.name.trim()) {
      toast.error('請輸入姓名');
      return;
    }
    
    if (!customerInfo.phone.trim()) {
      toast.error('請輸入電話');
      return;
    }

    if (!customerInfo.storeNumber.trim()) {
      toast.error('請選擇門市');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        store_number: customerInfo.storeNumber.trim(),
        items: orderItems,
        total_amount: getFinalTotal(), // 使用包含優惠券折扣的最終總額
        subtotal: getTotalPrice(), // 商品小計
        shipping_fee: getShippingFee(), // 運費
        coupon_code: appliedCoupon?.coupon.code || null, // 優惠券代碼
        coupon_id: appliedCoupon?.coupon.id || null, // 優惠券ID
        discount_amount: getCouponDiscount(), // 折扣金額
        delivery_option: 'store',
        notes: customerInfo.notes || ''
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        // 清空購物車
        clearCart();
        
        // 跳轉到訂單確認頁面，並在 URL 中包含訂單號
        navigate(`/order-confirmation?orderNumber=${result.data.order_number}`, {
          state: {
            order: result.data,
            customerInfo: customerInfo
          }
        });
      } else {
        throw new Error(result.message || '訂單提交失敗');
      }
    } catch (error: any) {
      console.error('訂單提交失敗:', error);
      toast.error(error instanceof Error ? error.message : '訂單提交失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">購物車是空的</h2>
          <p className="text-gray-600 mb-6">請先添加商品到購物車</p>
          <Button onClick={() => navigate('/products')}>
            去選購商品
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頭部導航 */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/products')}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                繼續購物
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">結帳</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 客戶信息表單 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">收件信息</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 姓名 */}
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    姓名 *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="請輸入您的姓名"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* 電話 */}
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4" />
                    電話號碼 *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="請輸入手機號碼 (09xxxxxxxx)"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                {/* 7-11門市選擇 */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    7-11取貨門市 *
                  </Label>

                  {/* 本地門市選擇器 */}
                  <StoreSelector
                    onStoreSelect={handleStoreSelect}
                    selectedStore={customerInfo.storeNumber ? {
                      id: customerInfo.storeNumber,
                      name: customerInfo.storeName,
                      tel: '',
                      address: ''
                    } : null}
                  />

                  {errors.storeNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.storeNumber}</p>
                  )}

                  {/* 手動輸入備選方案 */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">或手動輸入門市資訊</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="storeNumber" className="text-sm text-gray-600">
                          取件店號
                        </Label>
                        <Input
                          id="storeNumber"
                          type="text"
                          value={customerInfo.storeNumber}
                          onChange={(e) => handleInputChange('storeNumber', e.target.value)}
                          placeholder="請輸入6位數店號"
                          maxLength={6}
                          className={errors.storeNumber ? 'border-red-500' : ''}
                        />
                      </div>
                      <div>
                        <Label htmlFor="storeName" className="text-sm text-gray-600">
                          取件店名
                        </Label>
                        <Input
                          id="storeName"
                          type="text"
                          value={customerInfo.storeName}
                          onChange={(e) => handleInputChange('storeName', e.target.value)}
                          placeholder="請輸入門市名稱"
                          className={errors.storeNumber ? 'border-red-500' : ''}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 提交按鈕 */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      處理中...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      提交訂單
                    </div>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* 訂單摘要 */}
          <div className="lg:col-span-1">
            {/* 加購專區 */}
            <UpsellSection className="mb-6" />

            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">訂單摘要</h3>
              
              {/* 商品列表 */}
              <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="border-b border-gray-200 last:border-b-0 pb-3 mb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{item.productName}</h4>
                          {!item.variants || item.variants.length === 0 ? (
                            <div className="flex justify-between items-center mt-1">
                              <div>
                                <p className="text-xs text-gray-500">數量: {item.quantity}</p>
                                <p className="text-xs text-blue-600 font-medium">NT$ {item.productPrice} × {item.quantity}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-500">規格明細:</p>
                              {item.variants.map((variant, index) => (
                                <div key={variant.id} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      {variant.name}
                                    </span>
                                    <span className="text-blue-600 font-medium">NT$ {variant.price}</span>
                                    <span className="text-gray-500">× {variant.quantity || 1}</span>
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    NT$ {(variant.price * (variant.quantity || 1)).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">商品小計:</span>
                        <span className="font-medium text-gray-900 text-sm">
                          NT$ {item.subtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* 優惠信息 */}
              {getTotalSavings() > 0 && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm font-medium text-green-800">多件優惠已套用</span>
                  </div>
                  <div className="text-xs text-green-700">
                    <p>您已節省 NT$ {getTotalSavings().toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* 免運提示 */}
              {!isFreeShipping() && getAmountToFreeShipping() > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-800">🚚 運費提醒</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    <p>再購買 NT$ {getAmountToFreeShipping().toLocaleString()} 即可享免運優惠！</p>
                  </div>
                </div>
              )}

              {isFreeShipping() && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-green-800">恭喜！您已享有免運優惠</span>
                  </div>
                </div>
              )}

              {/* 優惠券區域 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-900 mb-3">優惠券</h4>
                
                {!appliedCoupon ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="請輸入優惠券代碼"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1 text-sm"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleValidateCoupon();
                          }
                        }}
                      />
                      <Button
                        onClick={handleValidateCoupon}
                        disabled={couponLoading || !couponCode.trim() || !customerInfo.phone}
                        className="px-4 py-2 text-sm"
                      >
                        {couponLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          '套用'
                        )}
                      </Button>
                    </div>
                    
                    {!customerInfo.phone && (
                      <p className="text-xs text-amber-600">
                        💡 請先填寫電話號碼才能使用優惠券
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          🎫 {appliedCoupon.coupon.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {appliedCoupon.coupon.description}
                        </p>
                        {appliedCoupon.discountAmount > 0 && (
                          <p className="text-xs text-green-700 font-medium">
                            折扣: -NT$ {appliedCoupon.discountAmount.toLocaleString()}
                          </p>
                        )}
                        {appliedCoupon.freeShipping && (
                          <p className="text-xs text-green-700 font-medium">
                            免運優惠已套用
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={handleRemoveCoupon}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 費用明細 */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">商品小計:</span>
                  <span className="text-sm text-gray-900">
                    NT$ {getTotalPrice().toLocaleString()}
                  </span>
                </div>

                {/* 優惠券折扣 */}
                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">優惠券折扣:</span>
                    <span className="text-sm text-green-600">
                      -NT$ {appliedCoupon.discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">運費:</span>
                  <span className={`text-sm ${getShippingFee() === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {getShippingFee() === 0 ? '免運' : `NT$ ${getShippingFee()}`}
                  </span>
                </div>

                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">總計:</span>
                  <span className="text-xl font-bold text-blue-600">
                    NT$ {getFinalTotal().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 配送信息 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">配送方式</h4>
                <p className="text-sm text-blue-800">7-11 店到店取貨</p>
                <p className="text-xs text-blue-600 mt-1">
                  商品將在3-5個工作天內送達指定門市
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
