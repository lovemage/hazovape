import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Package, Tag, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useCart } from '../contexts/CartContext';
import { productAPI } from '../services/api';
import { Product } from '../types';
import { getProductImageUrl } from '../utils/imageUtils';

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getTotalItems, toggleCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();

    // 當頁面獲得焦點時重新載入數據（從管理後台切換回來時）
    const handleFocus = () => {
      console.log('🔄 頁面獲得焦點，重新載入商品數據');
      loadProducts();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadProducts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      console.log('🔄 載入商品數據...');
      const response = await productAPI.getAll();
      if (response.data.success) {
        const newProducts = response.data.data || [];
        setProducts(newProducts);
        console.log('✅ 商品數據載入成功，共', newProducts.length, '個商品');

        // 檢查圖片數據
        newProducts.forEach(product => {
          if (product.images && product.images.length > 0) {
            console.log(`📸 商品 ${product.name} 的圖片:`, product.images);
          }
        });
      } else {
        setError('載入產品失敗');
      }
    } catch (error) {
      console.error('載入產品失敗:', error);
      setError('載入產品失敗');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    navigate('/flavors', { state: { selectedProduct: product } });
  };

  // 使用通用的圖片 URL 處理函數
  const getProductImage = (product: Product) => {
    return getProductImageUrl(product);
  };

  const getDiscountInfo = (product: Product) => {
    let discountRules: Record<string, number> = {};
    if (product.multi_discount) {
      if (typeof product.multi_discount === 'string') {
        try {
          discountRules = JSON.parse(product.multi_discount);
        } catch {
          return null;
        }
      } else {
        discountRules = product.multi_discount;
      }
    }

    const discounts = Object.entries(discountRules)
      .map(([key, value]) => {
        if (key.startsWith('item_')) {
          // 單件減額
          return {
            type: 'item_discount',
            quantity: parseInt(key.replace('item_', '')),
            amount: value,
            display: `第${key.replace('item_', '')}件起每件減${value}元`
          };
        } else {
          // 數量折扣
          return {
            type: 'quantity_discount',
            quantity: parseInt(key),
            discount: (1 - value) * 100,
            display: `${key}件以上${((1 - value) * 100).toFixed(0)}%折扣`
          };
        }
      })
      .sort((a, b) => a.quantity - b.quantity);

    return discounts.length > 0 ? discounts : null;
  };

  // 過濾商品
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.includes(product.name);
    return matchesSearch && matchesTags;
  });

  // 獲取所有商品名稱作為標籤
  const availableTags = products.map(product => product.name);

  // 標籤切換功能
  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(tag => tag !== tagName)
        : [...prev, tagName]
    );
  };

  // 清除所有過濾器
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };

  // 高亮搜索詞
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 text-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  const totalItems = getTotalItems();

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
          <Button onClick={() => loadProducts()}>重試</Button>
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
                onClick={() => navigate('/')}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首頁
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">選擇商品</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadProducts()}
                disabled={loading}
                className="ml-4"
                title="刷新商品數據"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">精選商品</h2>
          <p className="text-gray-600">請選擇您喜歡的商品，然後選擇口味</p>
        </div>

        {/* 搜索和過濾區域 */}
        <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
          {/* 搜索欄 */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索商品名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 商品標籤 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">快速選擇商品：</span>
              {(searchTerm || selectedTags.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-auto text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  清除過濾
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tagName) => (
                <Badge
                  key={tagName}
                  variant={selectedTags.includes(tagName) ? "default" : "secondary"}
                  className={`cursor-pointer transition-colors hover:opacity-80 ${
                    selectedTags.includes(tagName) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleTag(tagName)}
                >
                  {tagName}
                  {selectedTags.includes(tagName) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* 過濾結果統計 */}
          <div className="text-sm text-gray-500">
            {searchTerm || selectedTags.length > 0 ? (
              <span>
                顯示 {filteredProducts.length} / {products.length} 個商品
                {searchTerm && <span> • 搜索: "{searchTerm}"</span>}
                {selectedTags.length > 0 && <span> • 已選標籤: {selectedTags.length}</span>}
              </span>
            ) : (
              <span>共 {products.length} 個商品</span>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">目前沒有可用的商品</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">沒有找到符合條件的商品</p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm && `搜索詞: "${searchTerm}"`}
              {selectedTags.length > 0 && ` • 已選標籤: ${selectedTags.join(', ')}`}
            </p>
            <Button onClick={clearFilters} variant="outline" size="sm">
              清除過濾條件
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
                const discounts = getDiscountInfo(product);
                
                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group ${
                      selectedTags.includes(product.name) ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    {/* 商品圖片 */}
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                    </div>

                    {/* 商品信息 */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {highlightSearchTerm(product.name, searchTerm)}
                        {selectedTags.includes(product.name) && (
                          <Badge className="ml-2 text-xs bg-blue-100 text-blue-700">
                            已選
                          </Badge>
                        )}
                      </h3>

                      {/* 商品描述 */}
                      {product.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <span className="text-2xl font-bold text-blue-600">
                            NT$ {Math.round(product.price).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            點擊查看口味選項
                          </p>
                        </div>
                      </div>

                      {/* 多件優惠 */}
                      {discounts && discounts.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-1 mb-2">
                            <Tag className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600">多件優惠</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {discounts.map((discount, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className={`text-xs ${discount.type === 'item_discount' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                              >
                                {discount.type === 'item_discount'
                                  ? `第${discount.quantity}件起-${discount.amount}元`
                                  : `${discount.quantity}件-${discount.discount.toFixed(0)}%`
                                }
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 商品狀態 */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          可選購
                        </Badge>

                        <Button
                          variant="outline"
                          size="sm"
                          className="group-hover:bg-blue-50 group-hover:border-blue-300"
                        >
                          選擇此商品
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* 購物指南 */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">購物指南</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-3">
                                  <span className="text-blue-500 text-lg font-bold">1</span>
              <div>
                <p className="font-medium">選擇商品</p>
                <p>點擊您喜歡的商品卡片</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
                                  <span className="text-blue-500 text-lg font-bold">2</span>
              <div>
                <p className="font-medium">選擇口味</p>
                <p>從多種口味中選擇您的最愛</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
                                  <span className="text-blue-500 text-lg font-bold">3</span>
              <div>
                <p className="font-medium">確認結帳</p>
                <p>填寫收貨信息完成訂單</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
