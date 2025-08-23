import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Settings, Search, X, MessageCircle, Star, Gift, Truck, Coins, ChevronDown, Rocket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCart } from '../contexts/CartContext';
import { AnnouncementCarousel } from '../components/TypewriterText';
import { announcementAPI, productAPI, settingsAPI, productCategoryAPI } from '../services/api';
import { getProductImageUrl } from '../utils/imageUtils';
import { Announcement, Product } from '../types';
import { FloatingContactButtons } from '../components/FloatingContactButtons';
import { HeroCarousel } from '../components/HeroCarousel';

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { getTotalItems, toggleCart } = useCart();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroEnabled, setHeroEnabled] = useState(false);
  const [homepageTitle, setHomepageTitle] = useState('');
  const [homepageSubtitle, setHomepageSubtitle] = useState('');
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSubtitle, setSectionSubtitle] = useState('');
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [showAdminHint, setShowAdminHint] = useState(false);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [popupImage, setPopupImage] = useState<string>('/uploads/static/unlock-popup.png');
  const [popupEnabled, setPopupEnabled] = useState<boolean>(true);
  const [lineUrl, setLineUrl] = useState<string>('https://line.me/ti/p/euNh8K-s3e');
  const [telegramUrl, setTelegramUrl] = useState<string>('t.me/edward0521');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [heroBackgroundImage, setHeroBackgroundImage] = useState<string>('');
  const [heroImages, setHeroImages] = useState<string[]>([]);

  // 載入產品分類
  const loadCategories = useCallback(async () => {
    try {
      console.log('🏠 loadCategories 被調用');
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
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      console.log('🏠 loadAnnouncements 被調用');
      const response = await announcementAPI.getActive();
      if (response.data.success) {
        setAnnouncements(response.data.data || []);
      }
    } catch (error) {
      console.error('載入公告失敗:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🏠 loadProducts 被調用');
      const response = await productAPI.getAll();
      if (response.data.success) {
        // 修復 is_active 過濾邏輯，支持數字和布爾值
        const activeProducts = response.data.data.filter((product: Product) => {
          const isActiveValue = product.is_active as any;
          const isActive = Boolean(isActiveValue) && isActiveValue !== 0 && isActiveValue !== '0';
          console.log(`檢查商品 ${product.name} is_active:`, product.is_active, '啟用狀態:', isActive);
          return isActive;
        });
        setProducts(activeProducts.slice(0, 6)); // 首頁最多顯示6個商品
        
        // 隨機選擇 6 個產品作為精選產品
        const shuffled = [...activeProducts].sort(() => 0.5 - Math.random());
        setFeaturedProducts(shuffled.slice(0, 6));
        
        console.log('🏠 首頁商品載入成功，共', activeProducts.length, '個啟用商品');
        console.log('🎲 隨機精選產品:', shuffled.slice(0, 6).map(p => p.name));
        console.log('📋 啟用的商品:', activeProducts.map(p => ({ name: p.name, is_active: p.is_active })));
      }
    } catch (error) {
      console.error('🏠 首頁載入商品失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      console.log('🏠 loadSettings 被調用');
      const response = await settingsAPI.getAll();
      if (response.data.success && response.data.data) {
        const settings = response.data.data;
        if (settings.homepage_hero_enabled !== undefined) {
          const enabled = settings.homepage_hero_enabled === 'true' || settings.homepage_hero_enabled === true;
          setHeroEnabled(enabled);
          console.log('🏠 Hero 區域啟用狀態:', enabled);
        }
        if (settings.homepage_title) {
          setHomepageTitle(settings.homepage_title);
          console.log('🏠 首頁標題載入成功:', settings.homepage_title);
        }
        if (settings.homepage_subtitle) {
          setHomepageSubtitle(settings.homepage_subtitle);
          console.log('🏠 首頁標語載入成功:', settings.homepage_subtitle);
        }
        if (settings.popup_image) {
          setPopupImage(settings.popup_image);
          console.log('🏠 彈窗圖片載入成功:', settings.popup_image);
        }
        if (settings.popup_enabled !== undefined) {
          const enabled = settings.popup_enabled === 'true' || settings.popup_enabled === true;
          setPopupEnabled(enabled);
          console.log('🏠 彈窗啟用狀態:', enabled);
        }
        if (settings.contact_line) {
          setLineUrl(settings.contact_line);
          console.log('🏠 LINE URL 載入成功:', settings.contact_line);
        }
        if (settings.contact_telegram) {
          setTelegramUrl(settings.contact_telegram);
          console.log('🏠 Telegram URL 載入成功:', settings.contact_telegram);
        }
        if (settings.hero_background_image) {
          setHeroBackgroundImage(settings.hero_background_image);
          console.log('🏠 Hero 背景圖片載入成功:', settings.hero_background_image);
        }
        
        // 載入Hero輪播圖片（支援最多3張）
        const heroImageUrls = [];
        for (let i = 1; i <= 3; i++) {
          const imageKey = `hero_image_${i}`;
          if (settings[imageKey]) {
            heroImageUrls.push(settings[imageKey]);
            console.log(`🏠 Hero輪播圖片${i}載入成功:`, settings[imageKey]);
          }
        }
        
        // 如果沒有輪播圖片但有背景圖片，使用背景圖片
        if (heroImageUrls.length === 0 && settings.hero_background_image) {
          heroImageUrls.push(settings.hero_background_image);
        }
        
        setHeroImages(heroImageUrls);
        if (settings.homepage_section_enabled !== undefined) {
          const enabled = settings.homepage_section_enabled === 'true' || settings.homepage_section_enabled === true;
          setSectionEnabled(enabled);
          console.log('🏠 區塊啟用狀態載入成功:', enabled);
        }
        if (settings.homepage_section_title) {
          setSectionTitle(settings.homepage_section_title);
          console.log('🏠 區塊標題載入成功:', settings.homepage_section_title);
        }
        if (settings.homepage_section_subtitle) {
          setSectionSubtitle(settings.homepage_section_subtitle);
          console.log('🏠 區塊副標題載入成功:', settings.homepage_section_subtitle);
        }
      }
    } catch (error) {
      console.error('🏠 首頁載入設置失敗:', error);
      // 使用默認值，不影響頁面顯示
    }
  }, []);

  useEffect(() => {
    console.log('🏠 HomePage useEffect 觸發');
    loadAnnouncements();
    loadProducts();
    loadSettings();
    loadCategories();
  }, [loadAnnouncements, loadProducts, loadSettings, loadCategories]);

  useEffect(() => {
    // 顯示廣告彈窗，延遲1.5秒以確保設置載入完成
    const timer = setTimeout(() => {
      // 載入設置後再決定是否顯示彈窗
      if (popupEnabled) {
        setShowAdPopup(true);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [popupEnabled]);

  const handleLogoClick = () => {
    setAdminClickCount(prev => prev + 1);

    if (adminClickCount >= 4) {
      setShowAdminHint(true);
      setTimeout(() => setShowAdminHint(false), 3000);
    }

    if (adminClickCount >= 6) {
      navigate('/admin/login');
      setAdminClickCount(0);
    }
  };

  const formatPrice = (product: Product) => {
    const basePrice = Math.round(product.price);

    // 檢查是否有多件優惠
    let multiDiscount = {};
    try {
      multiDiscount = typeof product.multi_discount === 'string'
        ? JSON.parse(product.multi_discount)
        : product.multi_discount || {};
    } catch (e) {
      multiDiscount = {};
    }

    const hasDiscount = Object.keys(multiDiscount).length > 0;
    return hasDiscount ? `NT$ ${basePrice.toLocaleString()}起` : `NT$ ${basePrice.toLocaleString()}`;
  };

  const handleProductClick = (product: Product) => {
    navigate('/products', { state: { selectedProduct: product } });
  };

  const handleCategoryClick = (category: string) => {
    setShowCategoryMenu(false);
    navigate('/products', { state: { selectedCategory: category } });
  };

  const totalItems = getTotalItems();

  return (
    <div className="min-h-screen bg-white">
      {/* 頭部導航 */}
      <nav className="fixed top-0 left-0 right-0 shadow-sm border-b z-50 animated-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer group"
              onClick={handleLogoClick}
            >
              <img 
                src="/hazo-png.png" 
                alt="Hazo Logo" 
                className="w-10 h-10 mr-3 group-hover:scale-105 transition-transform rounded-md object-cover"
              />
              <h1 className="text-xl font-bold text-white">
                Hazo
              </h1>
            </div>

            {/* 導航選單 */}
            <div className="hidden md:flex items-center space-x-6">
              {/* 選購商品下拉選單 */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-white hover:text-blue-100 hover:bg-white/20"
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  onBlur={() => setTimeout(() => setShowCategoryMenu(false), 200)}
                >
                  <ShoppingBag className="w-4 h-4" />
                  選購商品
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
                </Button>
                
                {showCategoryMenu && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 hover:text-vintage-green transition-colors"
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 購物車按鈕 */}
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

      {/* 廣告彈窗 */}
      {showAdPopup && popupEnabled && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto relative overflow-hidden">
            {/* 關閉按鈕 */}
            <button
              onClick={() => setShowAdPopup(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>

            {/* 廣告圖片 */}
            <div className="w-full">
              <img
                src={popupImage}
                alt="Hazo Unlock 廣告"
                className="w-full h-auto max-w-md mx-auto rounded-lg shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/uploads/static/unlock-popup.png') {
                    target.src = '/uploads/static/unlock-popup.png';
                  }
                }}
                onClick={() => setShowAdPopup(false)}
              />
            </div>

            {/* 按鈕區域 */}
            <div className="p-6">
              <div className="flex gap-4 justify-center">
                {/* Line 按鈕 - Pixel 3D 風格 */}
                <button
                  onClick={() => {
                    window.open(lineUrl, '_blank');
                    setShowAdPopup(false);
                  }}
                  className="pixel-button pixel-button-green flex items-center justify-center gap-2 px-6 py-3 text-white font-bold text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.630-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.630.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12.017.572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                  </svg>
                  LINE
                </button>

                {/* Telegram 按鈕 - Pixel 3D 風格 */}
                <button
                  onClick={() => {
                    window.open(telegramUrl, '_blank');
                    setShowAdPopup(false);
                  }}
                  className="pixel-button pixel-button-blue flex items-center justify-center gap-2 px-6 py-3 text-white font-bold text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.180 1.896-.962 6.502-.962 6.502-.759 1.815-1.31 2.122-2.17 2.122-.92 0-1.518-.34-1.518-1.31v-7.956L8.078 8.698c-1.434-.679-1.59-1.773-.31-2.122l9.542-3.677c1.43-.552 2.624.273 2.258 2.261z"/>
                  </svg>
                  Telegram
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero 輪播區域 */}
      <HeroCarousel 
        images={heroImages}
        heroEnabled={heroEnabled}
        homepageTitle={homepageTitle}
        homepageSubtitle={homepageSubtitle}
      />

      {/* 標題副標題區塊 */}
      {sectionEnabled && (
        <section className="bg-gradient-to-r from-gray-50 to-blue-50 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {sectionTitle}
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
                {sectionSubtitle}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 公告區塊 */}
      {announcements.length > 0 && (
        <section className="bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-r from-vape-cyan to-vape-purple rounded-full animate-pulse"></div>
                最新公告
              </h3>
              <AnnouncementCarousel 
                announcements={announcements.map(a => ({ title: a.title, content: a.content }))}
                className="text-gray-700 text-base leading-relaxed"
              />
            </div>
          </div>
        </section>
      )}

      {/* 管理員提示 */}
      {showAdminHint && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-vintage-green text-white px-4 py-2 rounded-lg shadow-lg z-40 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="text-sm">再點擊 {7 - adminClickCount} 次進入管理界面</span>
        </div>
      )}

      {/* 主要內容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 精選商品 */}
        <div id="products" className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">精選商品</h2>
            <p className="text-gray-600">為您推薦的優質商品</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vape-purple"></div>
              <span className="ml-3 text-gray-600">載入商品中...</span>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="overflow-hidden">
              {/* 桌面端網格佈局 */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  >
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={getProductImageUrl(product)}
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
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                      <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                        優質商品，值得您的選擇
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-vintage-green">{formatPrice(product)}</span>
                        <button
                          className="group"
                          style={{
                            width: '110px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '10px',
                            backgroundColor: 'rgb(161, 255, 20)',
                            borderRadius: '30px',
                            color: 'rgb(19, 19, 19)',
                            fontWeight: '600',
                            fontSize: '14px',
                            border: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            transitionDuration: '.2s',
                            boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.116)',
                            paddingLeft: '8px'
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
                              height: '25px',
                              fill: 'rgb(19, 19, 19)'
                            }}
                          />
                          選購
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 移動端橫向滑動 */}
              <div className="md:hidden">
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 px-1" style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {featuredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="flex-none w-72 bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer snap-start"
                    >
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden relative">
                        <img
                          src={getProductImageUrl(product)}
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
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
                        <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                          優質商品，值得您的選擇
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-vintage-green">{formatPrice(product)}</span>
                          <button
                            className="group"
                            style={{
                              width: '110px',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              gap: '10px',
                              backgroundColor: 'rgb(161, 255, 20)',
                              borderRadius: '30px',
                              color: 'rgb(19, 19, 19)',
                              fontWeight: '600',
                              fontSize: '14px',
                              border: 'none',
                              position: 'relative',
                              cursor: 'pointer',
                              transitionDuration: '.2s',
                              boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.116)',
                              paddingLeft: '8px'
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
                                height: '25px',
                                fill: 'rgb(19, 19, 19)'
                              }}
                            />
                            選購
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <style>
                  {`
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">暫無商品展示</p>
                <p className="text-sm">請稍後再來查看</p>
              </div>
            </div>
          )}
        </div>

        {/* 行動按鈕 */}
        <div className="text-center">
          <Button
            onClick={() => navigate('/products')}
            className="bg-vintage-green hover:bg-vintage-pink hover:text-vintage-green text-white px-7 py-3 md:px-10 md:py-4 text-lg md:text-xl font-bold rounded-[5px] transform transition-all duration-300 hover:scale-105 shadow-2xl"
          >
            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" />
            開始選購商品
          </Button>
        </div>

        {/* 特色介紹 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">精美包裝</h4>
            <p className="text-gray-600 text-sm">每件商品都經過精心包裝</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">便利取貨</h4>
            <p className="text-gray-600 text-sm">支援7-11店到店取貨</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">多件優惠</h4>
            <p className="text-gray-600 text-sm">購買越多優惠越多</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 text-orange-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">品質保證</h4>
            <p className="text-gray-600 text-sm">嚴選優質原料製作</p>
          </div>
        </div>
      </main>

      {/* 懸浮聯繫按鈕 */}
      <FloatingContactButtons />
      
      {/* 移動端底部導航的佔位空間 */}
      <div className="h-16 md:hidden" />
    </div>
  );
};
