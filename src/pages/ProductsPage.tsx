import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, X, ArrowLeft, Rocket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useCart } from '../contexts/CartContext';
import { productAPI, productCategoryAPI } from '../services/api';
import { getProductImageUrl } from '../utils/imageUtils';
import { Product } from '../types';
import { FloatingContactButtons } from '../components/FloatingContactButtons';

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
}

export const ProductsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getTotalItems, toggleCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  const totalItems = getTotalItems();

  // 載入產品分類
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await productCategoryAPI.getAll();
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('載入分類失敗:', error);
      // 使用預設分類作為後備
      setCategories([
        { id: 1, name: '其他', description: '', sort_order: 1 }
      ]);
    }
  };

  useEffect(() => {
    // 從 location.state 獲取傳遞的數據
    if (location.state?.selectedProduct) {
      setSelectedProduct(location.state.selectedProduct);
    }
    if (location.state?.selectedCategory) {
      setSelectedCategory(location.state.selectedCategory);
    }
  }, [location.state]);

  // 加載產品數據
  useEffect(() => {
    loadProducts();
  }, []);

  // 產品篩選邏輯
  useEffect(() => {
    let filtered = products;

    // 分類篩選
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // 搜索篩選
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAll();
      if (response.data.success) {
        // 產品已經按 sort_order 從後端排序了，直接設置
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('載入產品失敗:', error);
    } finally {
      setLoading(false);
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
            discount: Number(value),
            display: `${key}件${((1 - Number(value)) * 100).toFixed(0)}%折扣`
          };
        }
      })
      .filter(discount => !isNaN(discount.quantity));

    return discounts.length > 0 ? discounts : null;
  };

  // 清除所有過濾器
  const clearFilters = () => {
    setSelectedCategory('');
    setSearchTerm('');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頭部導航 */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm border-b z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首頁
            </Button>

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
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">商品選購</h1>
            <p className="text-gray-600">選擇您喜愛的商品，點擊進入口味選擇</p>
          </div>

          {/* 篩選區域 */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* 搜索框 */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="搜索商品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 分類篩選 */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategoryChange(category.name)}
                    className={`${
                      selectedCategory === category.name 
                        ? 'bg-vintage-green text-white hover:bg-vintage-green/90' 
                        : 'border-vintage-green text-vintage-green hover:bg-vintage-green hover:text-white'
                    }`}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* 清除篩選 */}
              {(selectedCategory || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  清除篩選
                </Button>
              )}
            </div>

            {/* 篩選結果摘要 */}
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span>共找到 {filteredProducts.length} 個商品</span>
              {selectedCategory && (
                <Badge variant="secondary" className="bg-vintage-green/10 text-vintage-green">
                  分類: {selectedCategory}
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  搜索: {searchTerm}
                </Badge>
              )}
            </div>
          </div>

          {/* 產品列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vintage-green"></div>
              <span className="ml-3 text-gray-600">載入商品中...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">
                  {selectedCategory || searchTerm ? '沒有找到符合條件的商品' : '暫無商品展示'}
                </p>
                <p className="text-sm">
                  {selectedCategory || searchTerm ? '請嘗試調整篩選條件' : '請稍後再來查看'}
                </p>
              </div>
              {(selectedCategory || searchTerm) && (
                <Button onClick={clearFilters} variant="outline">
                  清除篩選條件
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => {
                const discounts = getDiscountInfo(product);
                
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleProductSelect(product)}
                  >
                    {/* 商品圖片 */}
                    <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden relative">
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
                        }}
                      />
                      {/* HAZO 角標 */}
                      <div 
                        className="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-black rounded-bl-lg"
                        style={{
                          backgroundColor: 'rgb(161, 255, 20)',
                          fontSize: '10px',
                          letterSpacing: '0.5px'
                        }}
                      >
                        HAZO
                      </div>
                    </div>

                    {/* 商品信息 */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                        {product.name}
                      </h3>
                      
                      {/* 商品分類 */}
                      {product.category && (
                        <Badge variant="secondary" className="mb-2 bg-vintage-green/10 text-vintage-green">
                          {product.category}
                        </Badge>
                      )}

                      {/* 商品描述 */}
                      {product.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* 價格和優惠 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-lg sm:text-xl font-bold text-vintage-green">
                            NT$ {Math.round(product.price).toLocaleString()}
                          </span>
                          {discounts && discounts.length > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              {discounts[0].display}
                            </p>
                          )}
                        </div>
                        <button
                          className="group flex-shrink-0"
                          style={{
                            width: '90px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '6px',
                            backgroundColor: 'rgb(161, 255, 20)',
                            borderRadius: '30px',
                            color: 'rgb(19, 19, 19)',
                            fontWeight: '600',
                            fontSize: '12px',
                            border: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            transitionDuration: '.2s',
                            boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.116)',
                            paddingLeft: '6px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(192, 255, 20)';
                            e.currentTarget.style.transitionDuration = '.5s';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgb(161, 255, 20)';
                            e.currentTarget.style.transitionDuration = '.5s';
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'scale(0.97)';
                            e.currentTarget.style.transitionDuration = '.2s';
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.transitionDuration = '.2s';
                          }}
                        >
                          <Rocket 
                            className="group-hover:rotate-[250deg] transition-transform duration-[1.5s]"
                            style={{
                              height: '20px',
                              fill: 'rgb(19, 19, 19)'
                            }}
                          />
                          選購
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      
      {/* 懸浮聯繫按鈕 */}
      <FloatingContactButtons />
      
      {/* 移動端底部導航的佔位空間 */}
      <div className="h-16 md:hidden" />
    </div>
  );
};
