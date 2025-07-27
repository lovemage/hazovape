import React, { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-toastify';

interface UpsellProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  images: string[];
  description?: string;
  is_active: boolean;
}

interface UpsellSectionProps {
  className?: string;
}

export const UpsellSection: React.FC<UpsellSectionProps> = ({ className = '' }) => {
  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { items, addItem, updateQuantity, removeFromCart } = useCart();

  useEffect(() => {
    loadUpsellProducts();
  }, []);

  const loadUpsellProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/upsell-products');
      const data = await response.json();
      
      if (data.success) {
        const activeProducts = data.data.filter((product: UpsellProduct) => 
          product.is_active && product.stock > 0
        );
        setUpsellProducts(activeProducts);
      }
    } catch (error) {
      console.error('載入加購商品失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCartQuantity = (productId: number, productName: string) => {
    const cartItem = items.find(item => 
      item.productId === productId && item.productName === `[加購] ${productName}`
    );
    return cartItem?.quantity || 0;
  };

  const handleAddToCart = (product: UpsellProduct, selectedFlavors: any[] = []) => {
    const quantity = quantities[product.id] || 1;
    
    // 如果產品有規格，使用第一個規格的價格作為基礎價格
    const basePrice = selectedFlavors.length > 0 ? selectedFlavors[0].final_price || product.price : product.price;
    
    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productPrice: basePrice,
      quantity,
      variants: [],
      subtotal: basePrice * quantity
    });

    toast.success(`已添加 ${product.name} 到購物車`);
  };

  const updateCartQuantity = (productId: number, productName: string, newQuantity: number) => {
    const cartItem = items.find(item => 
      item.productId === productId && item.productName === `[加購] ${productName}`
    );
    
    if (cartItem) {
      if (newQuantity <= 0) {
        removeFromCart(cartItem.id);
      } else {
        updateQuantity(cartItem.id, newQuantity);
      }
    }
  };

  const increaseQuantity = (productId: number, productName: string) => {
    const currentQuantity = getCartQuantity(productId, productName);
    updateCartQuantity(productId, productName, currentQuantity + 1);
  };

  const decreaseQuantity = (productId: number, productName: string) => {
    const currentQuantity = getCartQuantity(productId, productName);
    if (currentQuantity > 0) {
      updateCartQuantity(productId, productName, currentQuantity - 1);
    }
  };

  const getProductImage = (product: UpsellProduct) => {
    if (product.images && product.images.length > 0) {
      const imageUrl = product.images[0];
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      return `/uploads/upsell/${imageUrl}`;
    }
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOizg+WVhuWTgTwvdGV4dD48L3N2Zz4=';
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center py-8`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">載入加購商品中...</span>
      </div>
    );
  }

  if (upsellProducts.length === 0) {
    return null; // 沒有加購商品就不顯示這個區塊
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          推薦加購
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upsellProducts.map((product) => {
            const cartQuantity = getCartQuantity(product.id, product.name);
            
            return (
              <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWKoOizg+WVhuWTgTwvdGV4dD48L3N2Zz4=';
                  }}
                />
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                  {product.description && (
                    <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                  )}
                  <div className="flex items-center mt-2 space-x-2">
                    <span className="text-lg font-bold text-blue-600">
                      NT$ {product.price.toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      庫存: {product.stock}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {cartQuantity > 0 ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => decreaseQuantity(product.id, product.name)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{cartQuantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => increaseQuantity(product.id, product.name)}
                        disabled={cartQuantity >= product.stock}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleAddToCart(product)}
                      size="sm"
                      disabled={product.stock <= 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      加購
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};


