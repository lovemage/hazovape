import React, { useState, useEffect } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';

interface UpsellProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  images: string[];
  description: string;
}



interface UpsellSectionProps {
  className?: string;
}

export const UpsellSection: React.FC<UpsellSectionProps> = ({ className = '' }) => {
  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { state, addItem, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    fetchUpsellProducts();
  }, []);

  const fetchUpsellProducts = async () => {
    try {
      console.log('🛒 開始獲取加購商品...');
      const response = await fetch('/api/upsell-products');
      console.log('🛒 加購商品API響應狀態:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('🛒 加購商品API響應數據:', result);
        setUpsellProducts(result.data || []);
        console.log('🛒 設置加購商品數量:', result.data?.length || 0);
      } else {
        console.error('🛒 加購商品API響應錯誤:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('🛒 獲取加購商品失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const addUpsellItem = (product: UpsellProduct) => {
    if (product.stock <= 0) {
      toast.error('商品庫存不足');
      return;
    }

    // 檢查購物車中是否已有此加購商品
    const existingCartItem = state.items.find(item =>
      item.productId === product.id && item.name === product.name
    );

    if (existingCartItem) {
      if (existingCartItem.quantity >= product.stock) {
        toast.error('已達庫存上限');
        return;
      }
      // 更新購物車中的數量
      updateQuantity(existingCartItem.id, existingCartItem.quantity + 1);
    } else {
      // 添加新的加購商品到購物車
      addItem({
        productId: product.id,
        name: `[加購] ${product.name}`,
        price: product.price,
        quantity: 1,
        flavors: [],
        image: product.images[0]
      });
    }

    toast.success(`已加購 ${product.name}`);
  };

  const updateUpsellQuantity = (productId: number, productName: string, newQuantity: number) => {
    const product = upsellProducts.find(p => p.id === productId);
    if (!product) return;

    const cartItem = state.items.find(item =>
      item.productId === productId && item.name === `[加購] ${productName}`
    );

    if (!cartItem) return;

    if (newQuantity <= 0) {
      removeItem(cartItem.id);
      return;
    }

    if (newQuantity > product.stock) {
      toast.error('超過庫存數量');
      return;
    }

    updateQuantity(cartItem.id, newQuantity);
  };

  const removeUpsellItem = (productId: number, productName: string) => {
    const cartItem = state.items.find(item =>
      item.productId === productId && item.name === `[加購] ${productName}`
    );

    if (cartItem) {
      removeItem(cartItem.id);
    }
  };

  const getItemQuantity = (productId: number, productName: string) => {
    const cartItem = state.items.find(item =>
      item.productId === productId && item.name === `[加購] ${productName}`
    );
    return cartItem ? cartItem.quantity : 0;
  };

  console.log('🛒 UpsellSection 渲染狀態:', {
    cartItemsCount: state.items.length,
    loading,
    upsellProductsCount: upsellProducts.length,
    upsellProducts: upsellProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock }))
  });

  // 只有購物車有商品時才顯示加購專區
  if (state.items.length === 0) {
    console.log('🛒 購物車為空，不顯示加購專區');
    return null;
  }

  if (loading) {
    console.log('🛒 加購商品載入中...');
    return (
      <div className={`mb-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="flex gap-3 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-32 h-44 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (upsellProducts.length === 0) {
    console.log('🛒 沒有加購商品，不顯示加購專區');
    return null;
  }

  console.log('🛒 顯示加購專區，商品數量:', upsellProducts.length);

  return (
    <div className={`mb-6 ${className}`}>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">推薦加購</h3>
      </div>

      {/* 加購商品橫向滑動區域 */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {upsellProducts.map((product) => {
            const quantity = getItemQuantity(product.id, product.name);
            const isOutOfStock = product.stock <= 0;
            
            return (
              <Card 
                key={product.id} 
                className={`flex-shrink-0 w-32 h-44 ${isOutOfStock ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-3 h-full flex flex-col">
                  {/* 商品圖片 */}
                  <div className="relative mb-2 flex-shrink-0">
                    <div className="w-full h-20 bg-gray-100 rounded overflow-hidden">
                      {product.images[0] ? (
                        <img
                          src={`/uploads/upsell/${product.images[0]}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.errorHandled) {
                              target.dataset.errorHandled = 'true';
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlmYTZiNyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePiTwvdGV4dD48L3N2Zz4=';
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          無圖片
                        </div>
                      )}
                    </div>
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                        <span className="text-white text-xs font-medium">缺貨</span>
                      </div>
                    )}
                  </div>

                  {/* 商品信息 */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-gray-900 line-clamp-2 mb-1">
                        {product.name}
                      </h4>
                      <p className="text-sm font-bold text-blue-600">
                        NT$ {product.price}
                      </p>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="mt-2">
                      {quantity === 0 ? (
                        <Button
                          size="sm"
                          className="w-full h-6 text-xs"
                          onClick={() => addUpsellItem(product)}
                          disabled={isOutOfStock}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-6 h-6 p-0"
                            onClick={() => updateUpsellQuantity(product.id, product.name, quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-xs font-medium px-1">{quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-6 h-6 p-0"
                            onClick={() => updateUpsellQuantity(product.id, product.name, quantity + 1)}
                            disabled={quantity >= product.stock}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


    </div>
  );
};


