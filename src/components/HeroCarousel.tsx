import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroCarouselProps {
  images: string[];
  heroEnabled: boolean;
  homepageTitle?: string;
  homepageSubtitle?: string;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  images,
  heroEnabled,
  homepageTitle,
  homepageSubtitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // 過濾出有效圖片，最多3張
  const validImages = images.filter(img => img && img.trim() !== '').slice(0, 3);

  // 自動輪播
  useEffect(() => {
    if (!isAutoPlaying || validImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
    }, 4000); // 4秒切換

    return () => clearInterval(interval);
  }, [validImages.length, isAutoPlaying]);

  // 手動導航
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // 如果沒有圖片，不顯示任何背景
  const currentImage = validImages.length > 0 ? validImages[currentIndex] : null;

  // 如果沒有圖片且未啟用hero，不顯示整個組件
  if (validImages.length === 0 && !heroEnabled) {
    return null;
  }

  return (
    <div 
      className={`relative min-h-[38vh] md:min-h-screen overflow-hidden pt-16 transition-all duration-1000 ease-in-out ${
        currentImage ? 'bg-contain bg-center bg-no-repeat' : 'bg-gradient-to-br from-gray-100 to-gray-200'
      }`}
      style={{
        backgroundImage: currentImage ? `url('${currentImage}')` : undefined,
        backgroundSize: currentImage ? 'contain' : undefined
      }}
    >
      {/* 內容覆蓋層 */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(38vh-4rem)] md:min-h-[calc(100vh-4rem)]">
        <div className="text-center px-4 sm:px-6 lg:px-8 max-w-4xl">
          {/* Hero 區域標題（僅在啟用且有內容時顯示） */}
          {heroEnabled && (
            <>
              {/* 主標題 */}
              {homepageTitle && (
                <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold mb-2 md:mb-6 bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 bg-clip-text text-transparent drop-shadow-2xl">
                  {homepageTitle}
                </h1>
              )}
              
              {/* 副標題 */}
              {homepageSubtitle && (
                <p className="text-lg md:text-2xl lg:text-3xl text-gray-700 mb-4 md:mb-12 leading-relaxed font-medium drop-shadow-lg max-w-3xl mx-auto">
                  {homepageSubtitle}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 輪播控制（只在有多張圖片時顯示） */}
      {validImages.length > 1 && (
        <>
          {/* 左右箭頭 */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* 指示器 */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
            {validImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? 'bg-white shadow-lg scale-125'
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};