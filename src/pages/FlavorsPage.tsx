import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCart } from '../contexts/CartContext';
import { flavorAPI } from '../services/api';
import { getImageUrl } from '../utils/imageUtils';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { Product, Flavor } from '../types';
import { toast } from 'sonner';
import { ProductVariant } from '../types';
import { CartItem } from '../types';

export const FlavorsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem, getTotalItems, toggleCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [flavorQuantities, setFlavorQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlavorForImage, setSelectedFlavorForImage] = useState<Flavor | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 從 location.state 獲取傳遞的產品數據
  useEffect(() => {
    console.log('🔍 檢查 location.state:', location.state);
    if (location.state?.selectedProduct) {
      console.log('✅ 找到傳遞的產品:', location.state.selectedProduct);
      setSelectedProduct(location.state.selectedProduct);
    } else {
      console.log('❌ 沒有找到產品數據，返回產品列表');
      navigate('/products');
    }
  }, [location.state, navigate]);

  // 獲取產品圖片數組
  const getProductImages = useCallback((product: Product) => {
    let images: string[] = [];
    if (typeof product.images === 'string') {
      try {
        images = JSON.parse(product.images);
      } catch {
        images = [product.images];
      }
    } else if (Array.isArray(product.images)) {
      images = product.images;
    }
    return images.filter(img => img && img.trim()); // 過濾空值
  }, []);

  const getProductImage = useCallback((product: Product, index: number = 0) => {
    const images = getProductImages(product);
    if (images.length > index) {
      return getImageUrl(images[index]);
    }
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
  }, [getProductImages]);

  // 獲取當前顯示的圖片（規格圖片優先，沒有則使用產品圖片）
  const currentDisplayImage = useMemo(() => {
    // 如果有選中的規格且該規格有圖片，則使用規格圖片
    if (selectedFlavorForImage?.image) {
      const flavorImage = (selectedFlavorForImage.image as string);
      if (flavorImage.startsWith('http')) {
        return flavorImage;
      } else {
        return getImageUrl(flavorImage);
      }
    }
    
    // 否則使用產品圖片（支持多圖片輪播）
    return selectedProduct ? getProductImage(selectedProduct, currentImageIndex) : '';
  }, [selectedFlavorForImage, selectedProduct, currentImageIndex, getProductImage]);

  // 產品圖片導航函數
  const productImages = selectedProduct ? getProductImages(selectedProduct) : [];
  const hasMultipleImages = productImages.length > 1;

  const goToPreviousImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
    }
  };

  const goToNextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
    }
  };

  // 重置圖片索引當產品改變時
  useEffect(() => {
    setCurrentImageIndex(0);
    setSelectedFlavorForImage(null);
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      console.log('🔄 開始載入規格，產品:', selectedProduct.name);
      loadFlavors();
    }
  }, [selectedProduct]);

  const loadFlavors = async () => {
    try {
      setLoading(true);
      console.log('🔍 載入規格，商品ID:', selectedProduct.id);
      // 根據選中的商品ID獲取規格
      const response = await flavorAPI.getByProduct(selectedProduct.id);
      console.log('📦 規格 API 響應:', response.data);
      if (response.data.success) {
        const flavorsData = response.data.data || [];
        console.log('✅ 載入的規格數據:', flavorsData);
        setFlavors(flavorsData);
      } else {
        console.error('❌ API 返回失敗:', response.data);
        setError('載入規格失敗');
      }
    } catch (error) {
      console.error('❌ 載入規格失敗:', error);
      setError('載入規格失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleFlavorQuantityChange = (flavorId: number, delta: number) => {
    const flavor = flavors.find(f => f.id === flavorId);
    
    setFlavorQuantities(prev => {
      const currentQuantity = prev[flavorId] || 0;
      const newQuantity = currentQuantity + delta;

      if (newQuantity <= 0) {
        const { [flavorId]: removed, ...rest } = prev;
        
        // 如果移除的是當前選中的規格圖片，則清空選中狀態
        if (selectedFlavorForImage?.id === flavorId) {
          setSelectedFlavorForImage(null);
        }
        
        return rest;
      }

      // 檢查規格庫存
      if (flavor && newQuantity <= flavor.stock) {
        // 當選擇規格時，如果該規格有圖片，則設為當前圖片顯示的規格
        if (flavor.image && (!selectedFlavorForImage || selectedFlavorForImage.id !== flavorId)) {
          console.log('🖼️ 切換到規格圖片:', flavor.name, flavor.image);
          setSelectedFlavorForImage(flavor);
        }
        
        return {
          ...prev,
          [flavorId]: newQuantity
        };
      }

      return prev;
    });
  };

  const getDiscountInfo = () => {
    let discountRules: Record<string, number> = {};
    if (selectedProduct.multi_discount) {
      if (typeof selectedProduct.multi_discount === 'string') {
        try {
          discountRules = JSON.parse(selectedProduct.multi_discount);
        } catch {
          return null;
        }
      } else {
        discountRules = selectedProduct.multi_discount;
      }
    }
    return discountRules;
  };

  const getTotalQuantity = () => {
    return Object.values(flavorQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getCurrentPrice = () => {
    if (!selectedProduct) return 0;
    
    // 計算所選規格的總價格（使用每個規格的final_price）
    let totalPrice = 0;
    const validFlavors = flavors.filter(flavor => {
      const qty = flavorQuantities[flavor.id] || 0;
      return qty > 0;
    });

    if (validFlavors.length === 0) {
      return selectedProduct.price;
    }

    validFlavors.forEach(flavor => {
      const quantity = flavorQuantities[flavor.id] || 0;
      const flavorPrice = flavor.final_price || selectedProduct.price; // 使用規格最終價格
      totalPrice += flavorPrice * quantity;
    });
    
    return totalPrice;
  };

  const getAppliedDiscount = () => {
    const totalQuantity = getTotalQuantity();
    const discountRules = getDiscountInfo();
    if (!discountRules || totalQuantity === 0) return null;

    // 分別處理數量折扣和單件減額
    const quantityDiscounts: Record<number, number> = {};
    const itemDiscounts: Record<number, number> = {};

    Object.entries(discountRules).forEach(([key, value]) => {
      if (key.startsWith('item_')) {
        const qty = parseInt(key.replace('item_', ''));
        itemDiscounts[qty] = value;
      } else {
        quantityDiscounts[parseInt(key)] = value;
      }
    });

    // 先檢查數量折扣
    const applicableQuantityDiscounts = Object.keys(quantityDiscounts)
      .map(Number)
      .filter(minQty => totalQuantity >= minQty)
      .sort((a, b) => b - a);

    if (applicableQuantityDiscounts.length > 0) {
      const bestDiscount = quantityDiscounts[applicableQuantityDiscounts[0]];
      return {
        type: 'quantity_discount',
        minQuantity: applicableQuantityDiscounts[0],
        discount: (1 - bestDiscount) * 100,
        display: `${applicableQuantityDiscounts[0]}件以上${((1 - bestDiscount) * 100).toFixed(0)}%折扣`
      };
    }

    // 檢查單件減額
    const applicableItemDiscounts = Object.keys(itemDiscounts)
      .map(Number)
      .filter(startQty => totalQuantity >= startQty)
      .sort((a, b) => a - b);

    if (applicableItemDiscounts.length > 0) {
      const startQty = applicableItemDiscounts[0];
      const discountAmount = itemDiscounts[startQty];
      const discountedItems = totalQuantity - startQty + 1;
      return {
        type: 'item_discount',
        minQuantity: startQty,
        amount: discountAmount,
        discountedItems,
        display: `第${startQty}件起每件減${discountAmount}元 (共${discountedItems}件享優惠)`
      };
    }

    return null;
  };

  const handleAddToCart = () => {
    // 只加入有數量的規格
    const validFlavors = flavors.filter(flavor => {
      const qty = flavorQuantities[flavor.id] || 0;
      return qty > 0;
    });

    if (validFlavors.length === 0) {
      toast.error('請選擇規格');
      return;
    }

    const totalQuantity = getTotalQuantity();
    if (totalQuantity === 0) {
      toast.error('請選擇規格數量');
      return;
    }

    const totalPrice = getCurrentPrice();

    // 將Flavor[]轉換為ProductVariant[]
    const productVariants: ProductVariant[] = validFlavors.map(flavor => ({
      id: flavor.id,
      name: flavor.name,
      quantity: flavorQuantities[flavor.id] || 0,
      price: flavor.final_price || selectedProduct.price // 使用規格最終價格
    }));

    const newItem: CartItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productPrice: totalPrice / totalQuantity, // 平均單價（用於顯示）
      quantity: totalQuantity,
      variants: productVariants,
      subtotal: totalPrice
    };

    addItem(newItem);
    toast.success('已添加到購物車');
  };

  if (!selectedProduct) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadFlavors}>重試</Button>
        </div>
      </div>
    );
  }

  const totalItems = getTotalItems();
  const totalQuantity = getTotalQuantity();
  const currentPrice = getCurrentPrice();
  const originalPrice = selectedProduct.price * totalQuantity;
  const appliedDiscount = getAppliedDiscount();

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
                返回商品
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">選擇規格</h1>
            </div>

            <Button
              onClick={toggleCart}
              variant="outline"
              size="sm"
              className="relative"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              購物車
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 選中的商品信息 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          {/* 桌面端佈局 */}
          <div className="hidden md:flex items-center gap-6">
            <div className="relative w-40 h-40 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 group">
              <img
                src={currentDisplayImage}
                alt={selectedFlavorForImage ? `${selectedProduct.name} - ${selectedFlavorForImage.name}` : selectedProduct.name}
                className="w-full h-full object-contain bg-white transition-opacity duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ci8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                }}
              />
              
              {/* 圖片導航按鈕 */}
              {hasMultipleImages && !selectedFlavorForImage && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                    title="上一張圖片"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                    title="下一張圖片"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              
              {/* 圖片指示器 */}
              {hasMultipleImages && !selectedFlavorForImage && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {productImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentImageIndex
                          ? 'bg-white scale-125 shadow-lg'
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      title={`圖片 ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* 規格圖片標識 */}
              {selectedFlavorForImage && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {selectedFlavorForImage.name}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <p className="text-gray-600 mb-2">{selectedProduct.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                NT$ {Math.round(selectedProduct.price).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">各規格庫存請見下方</p>
            </div>
          </div>

          {/* 移動端佈局：圖片 - 價格 - 描述 */}
          <div className="md:hidden space-y-4">
            {/* 圖片 */}
            <div className="w-full">
              <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={currentDisplayImage}
                  alt={selectedFlavorForImage ? `${selectedProduct.name} - ${selectedFlavorForImage.name}` : selectedProduct.name}
                  className="w-full h-full object-contain bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                  }}
                />
              </div>
            </div>

            {/* 價格 */}
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600 mb-1">
                NT$ {Math.round(selectedProduct.price).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">各規格庫存請見下方</p>
            </div>

            {/* 標題和描述 */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <p className="text-gray-600 mb-2">{selectedProduct.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="pb-40 md:pb-32">
          {/* 規格選擇 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">選擇規格和數量</h3>

            {flavors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">目前沒有可用的規格</p>
              </div>
            ) : (
              <div className="space-y-4">
                {flavors.map((flavor) => {
                  const quantity = flavorQuantities[flavor.id] || 0;
                  return (
                    <div
                      key={flavor.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        quantity > 0
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* 規格小圖 */}
                          {flavor.image && (
                            <div 
                              className={`w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer transition-all duration-200 ${
                                selectedFlavorForImage?.id === flavor.id
                                  ? 'ring-2 ring-blue-500 ring-offset-1'
                                  : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                              }`}
                              onClick={() => setSelectedFlavorForImage(flavor)}
                              title="點擊查看大圖"
                            >
                              <img
                                src={flavor.image.startsWith('http') ? flavor.image : getImageUrl(flavor.image)}
                                alt={`${flavor.name} 圖片`}
                                className="w-full h-full object-contain bg-white"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-medium text-gray-900">
                                {flavor.name}
                              </h4>
                              {flavor.image && (
                                <span 
                                  className={`text-xs px-2 py-1 rounded-full cursor-pointer transition-colors ${
                                    selectedFlavorForImage?.id === flavor.id
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                  onClick={() => setSelectedFlavorForImage(flavor)}
                                  title="點擊查看大圖"
                                >
                                  圖片
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              庫存: {flavor.stock} 件
                            </p>
                            {quantity > 0 && (
                              <p className="text-sm text-blue-600 mt-1">
                                已選擇 {quantity} 件
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFlavorQuantityChange(flavor.id, -1)}
                            disabled={quantity <= 0}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>

                          <span className="text-lg font-semibold min-w-[2rem] text-center">
                            {quantity}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFlavorQuantityChange(flavor.id, 1)}
                            disabled={quantity >= flavor.stock}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalQuantity > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">訂購摘要：</h4>
                <div className="space-y-1">
                  {Object.entries(flavorQuantities).map(([flavorId, quantity]) => {
                    const flavor = flavors.find(f => f.id === parseInt(flavorId));
                    return flavor && quantity > 0 ? (
                      <div key={flavorId} className="flex justify-between text-sm">
                        <span>{flavor.name}</span>
                        <span className="font-medium">{quantity} 件</span>
                      </div>
                    ) : null;
                  })}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>總計</span>
                      <span>{totalQuantity} 件</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 浮動購物車明細 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 transition-transform duration-300">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 左側：總數量和價格 */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                {/* 總數量 */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-sm text-gray-600">總數量:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {totalQuantity} 件
                  </span>
                </div>

                {/* 價格 */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {appliedDiscount ? (
                    <>
                      <span className="text-sm text-gray-500 line-through">
                        NT$ {Math.round(originalPrice).toLocaleString()}
                      </span>
                      <span className={`text-lg font-bold ${appliedDiscount.type === 'item_discount' ? 'text-blue-600' : 'text-green-600'}`}>
                        NT$ {Math.round(currentPrice).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-blue-600">
                      NT$ {Math.round(currentPrice).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* 優惠信息 */}
              {appliedDiscount && (
                <div className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded ${appliedDiscount.type === 'item_discount' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'}`}>
                    {appliedDiscount.display}
                  </span>
                </div>
              )}
            </div>

            {/* 右側：加入購物車按鈕 */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              <Button
                onClick={handleAddToCart}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                size="lg"
                disabled={totalQuantity === 0}
              >
                加入購物車
                {totalQuantity > 0 && (
                  <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-sm">
                    {totalQuantity}
                  </span>
                )}
              </Button>
            </div>
          </div>

                     {/* 訂購明細和多件優惠（折疊顯示） */}
           {(totalQuantity > 0 || (getDiscountInfo() && Object.keys(getDiscountInfo()!).length > 0)) && (
             <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
               {/* 訂購明細 */}
               {totalQuantity > 0 && (
                 <details className="group">
                   <summary className="cursor-pointer flex items-center justify-between text-sm text-blue-800">
                     <span className="flex items-center gap-1">
                       <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                       訂購明細 ({totalQuantity} 件)
                     </span>
                     <span className="text-xs text-gray-500 group-open:hidden">展開查看</span>
                     <span className="text-xs text-gray-500 group-open:block hidden">收起</span>
                   </summary>
                   <div className="mt-2 space-y-1">
                     {Object.entries(flavorQuantities).map(([flavorId, quantity]) => {
                       const flavor = flavors.find(f => f.id === parseInt(flavorId));
                       return flavor && quantity > 0 ? (
                         <div key={flavorId} className="flex justify-between items-center text-xs p-2 bg-blue-50 rounded">
                           <span className="text-gray-700">{flavor.name}</span>
                           <span className="font-medium text-blue-600">{quantity} 件</span>
                         </div>
                       ) : null;
                     })}
                   </div>
                 </details>
               )}

               {/* 多件優惠 */}
               {getDiscountInfo() && Object.keys(getDiscountInfo()!).length > 0 && (
                 <details className="group">
                   <summary className="cursor-pointer flex items-center justify-between text-sm text-orange-800">
                     <span className="flex items-center gap-1">
                       <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                       多件優惠
                     </span>
                     <span className="text-xs text-gray-500 group-open:hidden">展開查看</span>
                     <span className="text-xs text-gray-500 group-open:block hidden">收起</span>
                   </summary>
                   <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                     {Object.entries(getDiscountInfo()!).map(([key, value]) => {
                       const isItemDiscount = key.startsWith('item_');
                       return (
                         <div key={key} className={`flex justify-between items-center text-xs p-2 rounded ${isItemDiscount ? 'text-blue-700 bg-blue-50' : 'text-orange-700 bg-orange-50'}`}>
                           <span>
                             {isItemDiscount
                               ? `第${key.replace('item_', '')}件起`
                               : `${key}件以上`
                             }
                           </span>
                           <span className="font-medium">
                             {isItemDiscount
                               ? `每件減${value}元`
                               : `-${((1 - Number(value)) * 100).toFixed(0)}%`
                             }
                           </span>
                         </div>
                       );
                     })}
                   </div>
                 </details>
               )}
             </div>
           )}
          
          {/* 提示文字 */}
          {totalQuantity === 0 && (
            <div className="text-center mt-2">
              <p className="text-xs text-red-500">
                請至少選擇一種規格和數量
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* 懸浮聯繫按鈕 */}
      <FloatingContactButtons />
    </div>
  );
};
