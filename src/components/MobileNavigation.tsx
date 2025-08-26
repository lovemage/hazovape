import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronUp, Home, Package } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { productCategoryAPI } from '../services/api';

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
}

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems, toggleCart } = useCart();
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // 載入產品分類
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productCategoryAPI.getAll();
        if (response.data.success) {
          setCategories(response.data.data || []);
        }
      } catch (error) {
        console.error('載入分類失敗:', error);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryClick = (category: string) => {
    setShowCategoryMenu(false);
    navigate('/products', { state: { selectedCategory: category } });
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  const totalItems = getTotalItems();

  // 在管理員頁面或其他特定頁面不顯示
  if (location.pathname.includes('/admin') || 
      location.pathname === '/checkout' || 
      location.pathname === '/order-confirmation') {
    return null;
  }

  return (
    <>
      {/* 分類下拉選單遮罩和內容 */}
      {showCategoryMenu && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-30" 
            onClick={() => setShowCategoryMenu(false)}
          />
          
          {/* 下拉選單 */}
          <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">選購商品</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700 border-b border-gray-50 last:border-b-0 transition-colors"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 底部導航欄 */}
      <div className="fixed bottom-0 left-0 right-0 animated-nav border-t border-white/20 shadow-lg z-30 md:hidden">
        <div className="flex items-center justify-around py-2">
          {/* 首頁按鈕 */}
          <Button
            onClick={handleHomeClick}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              location.pathname === '/' 
                ? 'text-white bg-white/20' 
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">首頁</span>
          </Button>

          {/* 選購商品按鈕 */}
          <Button
            onClick={() => setShowCategoryMenu(!showCategoryMenu)}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              showCategoryMenu
                ? 'text-white bg-white/20'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <div className="relative">
              <Package className="w-5 h-5" />
              <ChevronUp 
                className={`w-3 h-3 absolute -top-1 -right-1 transition-transform ${
                  showCategoryMenu ? 'rotate-180' : ''
                }`} 
              />
            </div>
            <span className="text-xs font-medium">商品</span>
          </Button>

          {/* 購物車按鈕 */}
          <Button
            onClick={toggleCart}
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1 px-4 py-2 text-white/80 hover:text-white relative"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">購物車</span>
          </Button>
        </div>
      </div>
    </>
  );
}; 