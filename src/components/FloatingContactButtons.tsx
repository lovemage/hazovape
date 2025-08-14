import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface FloatingContactButtonsProps {
  className?: string;
}

export const FloatingContactButtons: React.FC<FloatingContactButtonsProps> = ({ className = '' }) => {
  const location = useLocation();
  const [enabled, setEnabled] = useState<boolean>(true);
  const [lineUrl, setLineUrl] = useState<string>('https://line.me/ti/p/@590shgcm');
  const [telegramUrl, setTelegramUrl] = useState<string>('https://t.me/whalesale');

  // 檢查是否有底部導航（與 MobileNavigation 組件邏輯一致）
  const hasBottomNavigation = !location.pathname.includes('/admin') && 
                              location.pathname !== '/checkout' && 
                              location.pathname !== '/order-confirmation';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          const settings = data.data || {};
          
          // 載入懸浮按鈕啟用狀態
          if (settings.floating_buttons_enabled !== undefined) {
            const isEnabled = settings.floating_buttons_enabled === 'true' || settings.floating_buttons_enabled === true;
            setEnabled(isEnabled);
          }
          
          // 載入聯繫方式
          if (settings.contact_line) {
            setLineUrl(settings.contact_line);
          }
          if (settings.contact_telegram) {
            setTelegramUrl(settings.contact_telegram);
          }
        }
      } catch (error) {
        console.error('載入懸浮按鈕設置失敗:', error);
      }
    };

    loadSettings();
  }, []);

  if (!enabled) {
    return null;
  }

  // 根據是否有底部導航調整位置
  const bottomPosition = hasBottomNavigation ? 'bottom-20 md:bottom-6' : 'bottom-6';

  return (
    <div className={`fixed ${bottomPosition} right-6 flex flex-col gap-3 z-40 ${className}`}>
      {/* LINE 按鈕 */}
      <button
        onClick={() => window.open(lineUrl, '_blank')}
        className="w-14 h-14 bg-green-500/80 hover:bg-green-500 backdrop-blur-sm text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
        title="聯繫 LINE 客服"
      >
        <svg className="w-7 h-7 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.630-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.630.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12.017.572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
      </button>

      {/* Telegram 按鈕 */}
      <button
        onClick={() => window.open(telegramUrl, '_blank')}
        className="w-14 h-14 bg-blue-500/80 hover:bg-blue-500 backdrop-blur-sm text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
        title="聯繫 Telegram 客服"
      >
        <svg className="w-7 h-7 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.180 1.896-.962 6.502-.962 6.502-.759 1.815-1.31 2.122-2.17 2.122-.92 0-1.518-.34-1.518-1.31v-7.956L8.078 8.698c-1.434-.679-1.59-1.773-.31-2.122l9.542-3.677c1.43-.552 2.624.273 2.258 2.261z"/>
        </svg>
      </button>
    </div>
  );
};