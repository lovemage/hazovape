import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCart } from '../contexts/CartContext';

export const CartSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { items, isOpen, toggleCart, updateQuantity, removeFromCart, getTotalItems, getTotalPrice } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={toggleCart} />
      
      {/* 側邊欄 */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* 頭部 */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <h2 className="text-lg font-semibold">購物車</h2>
              {getTotalItems() > 0 && (
                <Badge variant="secondary">{getTotalItems()}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={toggleCart}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 內容 */}
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">購物車是空的</p>
              </div>
            </div>
          ) : (
            <>
              {/* 商品列表 */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.productName}</h3>
                          {!item.variants || item.variants.length === 0 ? (
                            <p className="text-sm text-blue-600 font-medium">NT$ {item.productPrice}</p>
                          ) : (
                            <p className="text-xs text-gray-500">多規格商品</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* 規格顯示 - 分別列出每個規格的價格和數量 */}
                      {item.variants && item.variants.length > 0 ? (
                        <div className="space-y-2">
                          {item.variants.map((variant, index) => (
                            <div key={variant.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {variant.name}
                                  </Badge>
                                  <span className="text-sm text-blue-600 font-medium">
                                    NT$ {variant.price}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateQuantity(item.id, Math.max(1, (variant.quantity || 1) - 1), variant.id.toString())}
                                    disabled={(variant.quantity || 1) <= 1}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Minus className="h-2 w-2" />
                                  </Button>
                                  <span className="text-xs font-medium w-6 text-center">
                                    {variant.quantity || 1}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateQuantity(item.id, (variant.quantity || 1) + 1, variant.id.toString())}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Plus className="h-2 w-2" />
                                  </Button>
                                </div>
                                <span className="text-xs font-medium text-gray-900 ml-2">
                                  NT$ {(variant.price * (variant.quantity || 1)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 無規格商品的數量調整 */
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* 小計 */}
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              NT$ {item.subtotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 有規格商品的總小計 */}
                      {item.variants && item.variants.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">商品小計:</span>
                            <span className="text-sm font-medium text-gray-900">
                              NT$ {item.subtotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部總計和結帳 */}
              <div className="border-t bg-gray-50 px-4 py-4">
                <div className="mb-4">
                  <div className="flex justify-between text-base font-medium">
                    <p>總計</p>
                    <p>NT$ {getTotalPrice().toLocaleString()}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    共 {getTotalItems()} 件商品
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    toggleCart();
                    navigate('/checkout');
                  }}
                >
                  前往結帳
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
