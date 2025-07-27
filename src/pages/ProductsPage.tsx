import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Filter, Search, X, ArrowLeft, Plus, Minus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useCart } from '../contexts/CartContext';
import { productAPI, productCategoryAPI } from '../services/api';
import { getProductImageUrl } from '../utils/imageUtils';
import { Product } from '../types';

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
}

export const ProductsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart, getTotalItems, toggleCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<{[key: number]: {id: number, name: string}[]}>({});
  const [quantities, setQuantities] = useState<{[key: number]: number}>({});
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
        { id: 1, name: '一次性拋棄式電子煙', description: '', sort_order: 1 },
        { id: 2, name: '注油式主機與耗材', description: '', sort_order: 2 },
        { id: 3, name: '拋棄式通用煙蛋系列', description: '', sort_order: 3 },
        { id: 4, name: '小煙油系列', description: '', sort_order: 4 },
        { id: 5, name: '其他產品', description: '', sort_order: 5 }
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
    setSelectedCategory('');
    setSearchTerm('');
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const discounts = getDiscountInfo(product);
              
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleProductSelect(product)}
                >
                  {/* 商品圖片 */}
                  <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden">
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
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-vintage-green">
                          NT$ {Math.round(product.price).toLocaleString()}
                        </span>
                        {discounts && discounts.length > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            {discounts[0].display}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-vintage-green hover:bg-vintage-green/90 text-white"
                      >
                        選購
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
