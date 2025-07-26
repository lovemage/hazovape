import React from 'react';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export const CartSidebar: React.FC = () => {
  const { state, closeCart, updateQuantity, removeItem, getTotalItems, getTotalPrice, getDiscountedPrice } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 背景遮罩 */}
      <div 
        className="flex-1 bg-black bg-opacity-50 transition-opacity"
        onClick={closeCart}
      />
      
      {/* 側邊欄 */}
      <div className="w-full max-w-md bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* 頭部 */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              購物車 ({getTotalItems()})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeCart}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 商品列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {state.items.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">購物車是空的</p>
                <p className="text-sm text-gray-400 mt-2">快去挑選您喜歡的商品吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {state.items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        {item.originalPrice && item.originalPrice !== item.price ? (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-400 line-through">NT$ {item.originalPrice}</p>
                            <p className="text-sm text-red-600 font-medium">NT$ {item.price}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-blue-600 font-medium">NT$ {item.price}</p>
                        )}
                        {item.discountInfo && (
                          <p className="text-xs text-green-600 mt-1">{item.discountInfo.display}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* 口味顯示 */}
                    {item.flavors && item.flavors.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">選擇的口味：</p>
                        <div className="flex flex-wrap gap-1">
                          {item.flavors.map((flavor, index) => (
                            <span
                              key={index}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                            >
                              {flavor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 數量控制 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-white rounded-lg border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-1 min-w-[2rem] text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-right">
                        {item.multiDiscount ? (
                          <div>
                            <p className="font-semibold text-red-600">
                              NT$ {getDiscountedPrice(item.productId, item.quantity, item.originalPrice || item.price, item.multiDiscount).toLocaleString()}
                            </p>
                            {item.originalPrice && (
                              <p className="text-xs text-gray-400 line-through">
                                NT$ {(item.originalPrice * item.quantity).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="font-semibold text-gray-900">
                            NT$ {(item.price * item.quantity).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部結帳區域 */}
          {state.items.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-gray-900">總計：</span>
                <span className="text-xl font-bold text-blue-600">
                  NT$ {getTotalPrice().toLocaleString()}
                </span>
              </div>
              <Button 
                onClick={handleCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                前往結帳
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
