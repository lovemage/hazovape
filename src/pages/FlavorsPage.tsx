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
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
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

  const handleFlavorSelect = (flavor: Flavor) => {
    setSelectedFlavor(flavor);
    setQuantity(1); // 重置數量為1
    
    // 如果該規格有圖片，則設為當前圖片顯示的規格
    if (flavor.image) {
      console.log('🖼️ 切換到規格圖片:', flavor.name, flavor.image);
      setSelectedFlavorForImage(flavor);
    } else {
      setSelectedFlavorForImage(null);
    }
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedFlavor) return;
    
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= selectedFlavor.stock) {
      setQuantity(newQuantity);
    }
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
    return selectedFlavor ? quantity : 0;
  };

  const getCurrentPrice = () => {
    if (!selectedProduct || !selectedFlavor) return 0;
    
    const flavorPrice = selectedFlavor.final_price || selectedProduct.price;
    return flavorPrice * quantity;
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
    if (!selectedFlavor) {
      toast.error('請選擇口味');
      return;
    }

    if (quantity <= 0) {
      toast.error('請選擇數量');
      return;
    }

    const totalPrice = getCurrentPrice();
    const flavorPrice = selectedFlavor.final_price || selectedProduct.price;

    const productVariants: ProductVariant[] = [{
      id: selectedFlavor.id,
      name: selectedFlavor.name,
      quantity: quantity,
      price: flavorPrice
    }];

    const newItem: CartItem = {
      id: `${selectedProduct.id}-${selectedFlavor.id}-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productPrice: flavorPrice,
      quantity: quantity,
      variants: productVariants,
      subtotal: totalPrice
    };

    addItem(newItem);
    toast.success(`已添加 ${selectedFlavor.name} x${quantity} 到購物車`);
    
    // 重置選擇
    setSelectedFlavor(null);
    setQuantity(1);
    setSelectedFlavorForImage(null);
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
    <div 
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: 'url(/images_title/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* 頭部導航 */}
      <nav className="shadow-sm border-b sticky top-0 z-40 animated-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/products')}
                className="mr-4 text-white hover:text-blue-100 hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回商品
              </Button>
              <h1 className="text-lg font-semibold text-white">選擇規格</h1>
            </div>

            <Button
              onClick={toggleCart}
              variant="outline"
              size="sm"
              className="relative bg-white/95 hover:bg-white border-white text-gray-900 hover:text-gray-900"
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
            <div className="w-full relative">
              <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden shadow-sm relative group">
                <img
                  src={currentDisplayImage}
                  alt={selectedFlavorForImage ? `${selectedProduct.name} - ${selectedFlavorForImage.name}` : selectedProduct.name}
                  className="w-full h-full object-contain bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                  }}
                />
                
                {/* 移動端圖片導航按鈕 */}
                {hasMultipleImages && !selectedFlavorForImage && (
                  <>
                    <button
                      onClick={goToPreviousImage}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-200 z-10 active:scale-95"
                      title="上一張圖片"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={goToNextImage}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-200 z-10 active:scale-95"
                      title="下一張圖片"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                
                {/* 移動端圖片指示器 */}
                {hasMultipleImages && !selectedFlavorForImage && (
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {productImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === currentImageIndex
                            ? 'bg-white scale-110 shadow-lg'
                            : 'bg-white/60 hover:bg-white/80'
                        }`}
                        title={`圖片 ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* 移動端圖片狀態顯示 */}
                {hasMultipleImages && !selectedFlavorForImage && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {currentImageIndex + 1} / {productImages.length}
                  </div>
                )}

                {/* 規格圖片標識 */}
                {selectedFlavorForImage && (
                  <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                    {selectedFlavorForImage.name}
                  </div>
                )}
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

        {/* 步驟指示 */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className={`flex items-center gap-2 ${selectedFlavor ? 'text-green-600' : 'text-blue-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                selectedFlavor ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                1
              </div>
              <span>選擇口味</span>
              {selectedFlavor && <span className="text-green-600">✓</span>}
            </div>
            <div className={`flex items-center gap-2 ${selectedFlavor && quantity > 0 ? 'text-green-600' : selectedFlavor ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                selectedFlavor && quantity > 0 ? 'bg-green-100 text-green-600' : 
                selectedFlavor ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span>選擇數量</span>
              {selectedFlavor && quantity > 0 && <span className="text-green-600">✓</span>}
            </div>
            <div className={`flex items-center gap-2 ${selectedFlavor && quantity > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                selectedFlavor && quantity > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                3
              </div>
              <span>加入購物車</span>
            </div>
          </div>
        </div>

        {/* 第一步：選擇口味 */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">第一步：選擇口味</h3>
          
          {flavors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">目前沒有可用的口味</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {flavors.map((flavor) => (
                <button
                  key={flavor.id}
                  onClick={() => handleFlavorSelect(flavor)}
                  disabled={flavor.stock <= 0}
                  className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                    selectedFlavor?.id === flavor.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : flavor.stock <= 0
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {/* 口味小圖 */}
                  {flavor.image && (
                    <div className="w-full h-20 bg-gray-100 rounded-md overflow-hidden mb-3">
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
                  
                  <h4 className="font-medium text-gray-900 mb-1 text-sm">
                    {flavor.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {flavor.stock > 0 ? `庫存 ${flavor.stock} 件` : '缺貨'}
                  </p>
                  
                  {selectedFlavor?.id === flavor.id && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      已選擇 ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 第二步：選擇數量 */}
        {selectedFlavor && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">第二步：選擇數量</h3>
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">已選擇：{selectedFlavor.name}</h4>
                  <p className="text-sm text-gray-600">庫存：{selectedFlavor.stock} 件</p>
                </div>
                {selectedFlavor.image && (
                  <div className="w-16 h-16 bg-white rounded-lg overflow-hidden">
                    <img
                      src={selectedFlavor.image.startsWith('http') ? selectedFlavor.image : getImageUrl(selectedFlavor.image)}
                      alt={`${selectedFlavor.name} 圖片`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="h-12 w-12 p-0"
                >
                  <Minus className="w-5 h-5" />
                </Button>

                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{quantity}</div>
                  <div className="text-sm text-gray-600">件</div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= selectedFlavor.stock}
                  className="h-12 w-12 p-0"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-lg font-semibold text-gray-900">
                  小計：NT$ {Math.round(getCurrentPrice()).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 第三步：加入購物車 */}
        {selectedFlavor && quantity > 0 && (
          <div className="mb-20">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">第三步：確認加入購物車</h3>
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedFlavor.name}</h4>
                  <p className="text-sm text-gray-600">數量：{quantity} 件</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">
                    NT$ {Math.round(getCurrentPrice()).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                加入購物車
              </Button>
            </div>
          </div>
        )}
      </main>

      
      {/* 懸浮聯繫按鈕 */}
      <FloatingContactButtons />
    </div>
  );
};
