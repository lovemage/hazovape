import React, { useState, useCallback, useEffect } from 'react';
import { MapPin, Phone, Copy, X } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  name: string;
  tel: string;
  address: string;
}

interface EcpayStoreData {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeTelephone: string;
  extraData: string;
}

interface StoreSelectorProps {
  onStoreSelect: (store: StoreData) => void;
  selectedStore?: StoreData | null;
  className?: string;
}

export const StoreSelector: React.FC<StoreSelectorProps> = ({
  onStoreSelect,
  selectedStore,
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // 設定全域回調函數來接收綠界地圖選擇結果
  useEffect(() => {
    console.log('🔧 StoreSelector useEffect 執行，設定回調函數');
    console.log('🔧 onStoreSelect 函數:', onStoreSelect);
    
    // 在window上設定回調函數
    (window as any).handleStoreSelection = (ecpayStoreData: EcpayStoreData) => {
      console.log('🏪 收到門市選擇回調:', ecpayStoreData);
      
      const storeData: StoreData = {
        id: ecpayStoreData.storeId,
        name: ecpayStoreData.storeName,
        tel: ecpayStoreData.storeTelephone,
        address: ecpayStoreData.storeAddress
      };
      
      console.log('🏪 轉換後的門市數據:', storeData);
      console.log('🏪 正在調用 onStoreSelect:', onStoreSelect);
      
      try {
        onStoreSelect(storeData);
        console.log('✅ onStoreSelect 調用成功');
        toast.success(`已選擇門市：${storeData.name}`);
      } catch (error) {
        console.error('❌ onStoreSelect 調用失敗:', error);
        toast.error('門市選擇失敗，請重試');
      }
      
      // 發送確認訊息給回調視窗
      setTimeout(() => {
        const popups = window.open('', 'ecpay_map_window');
        if (popups && !popups.closed) {
          popups.postMessage({ type: 'STORE_SELECTION_RECEIVED' }, '*');
        }
      }, 100);
    };

    // 設定 postMessage 監聽器作為備選方案
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 收到 postMessage:', event.data);
      
      if (event.data && (event.data.type === 'STORE_SELECTION' || event.data.type === 'ECPAY_STORE_SELECTION') && event.data.data) {
        const ecpayStoreData = event.data.data;
        console.log('📨 通過 postMessage 收到門市數據:', ecpayStoreData);
        
        // 使用同樣的處理邏輯
        if (typeof (window as any).handleStoreSelection === 'function') {
          (window as any).handleStoreSelection(ecpayStoreData);
        } else {
          console.error('❌ postMessage handleStoreSelection 函數不存在');
        }
      }
    };

    // 設定 localStorage 監聽器 (主要回調方案)
    const handleStorageChange = (event: StorageEvent) => {
      console.log('📦 收到 localStorage 變化:', event.key, event.newValue);
      
      if ((event.key === 'ecpay_store_selection' || event.key === 'ecpay_store_selection_manual') && event.newValue) {
        try {
          const selectionData = JSON.parse(event.newValue);
          console.log('📦 解析 localStorage 門市數據:', selectionData);
          
          if (selectionData.storeData && selectionData.source === 'ecpay_callback') {
            // 檢查時間戳，只處理最近 30 秒內的數據
            const timeDiff = Date.now() - selectionData.timestamp;
            if (timeDiff < 30000) { // 30秒內
              console.log('✅ 通過 localStorage 收到有效門市數據');
              console.log('📦 準備調用 handleStoreSelection，數據:', selectionData.storeData);
              
              if (typeof (window as any).handleStoreSelection === 'function') {
                (window as any).handleStoreSelection(selectionData.storeData);
                console.log('✅ handleStoreSelection 調用完成');
              } else {
                console.error('❌ handleStoreSelection 函數不存在');
              }
              
              // 清理 localStorage 數據
              localStorage.removeItem('ecpay_store_selection');
            } else {
              console.log('⚠️ localStorage 數據過期，忽略');
            }
          }
        } catch (error) {
          console.error('❌ 解析 localStorage 數據失敗:', error);
        }
      }
    };

    // 移動端專用：定期檢查 localStorage (因為某些移動瀏覽器的 storage 事件可能不可靠)
    const pollForStorageChanges = () => {
      let lastCheckFlag = '';
      
      const checkStorage = () => {
        try {
          // 檢查移動端標記
          const mobileFlag = localStorage.getItem('ecpay_mobile_callback_flag');
          if (mobileFlag && mobileFlag !== lastCheckFlag) {
            console.log('🔄 檢測到移動端回調標記變化:', mobileFlag);
            lastCheckFlag = mobileFlag;
            
            // 檢查實際數據
            const existingData = localStorage.getItem('ecpay_store_selection');
            if (existingData) {
              console.log('🔄 移動端檢查發現 localStorage 數據');
              handleStorageChange({
                key: 'ecpay_store_selection',
                newValue: existingData,
                oldValue: null
              } as StorageEvent);
              
              // 清理標記
              localStorage.removeItem('ecpay_mobile_callback_flag');
            }
          }
        } catch (error) {
          console.error('❌ 移動端 localStorage 檢查失敗:', error);
        }
      };

      // 每0.5秒檢查一次，持續60秒 (移動端需要更頻繁的檢查)
      const pollInterval = setInterval(checkStorage, 500);
      setTimeout(() => {
        clearInterval(pollInterval);
        console.log('🔄 移動端 localStorage 輪詢結束');
      }, 60000);

      return pollInterval;
    };

    // URL hash 監聽器 (移動端備選方案)
    const handleHashChange = () => {
      try {
        const hash = window.location.hash;
        if (hash.startsWith('#store_selected_')) {
          console.log('🔗 檢測到 URL hash 門市選擇:', hash);
          
          const parts = hash.substring(15).split('_'); // 移除 "#store_selected_"
          if (parts.length >= 2) {
            const timestamp = parseInt(parts[0]);
            const encodedData = parts.slice(1).join('_');
            
            // 檢查時間戳，只處理最近 30 秒內的數據
            const timeDiff = Date.now() - timestamp;
            if (timeDiff < 30000) {
              try {
                const storeData = JSON.parse(decodeURIComponent(encodedData));
                console.log('🔗 從 URL hash 解析門市數據:', storeData);
                
                if (typeof (window as any).handleStoreSelection === 'function') {
                  (window as any).handleStoreSelection(storeData);
                  console.log('✅ URL hash handleStoreSelection 調用完成');
                }
                
                // 清理 hash
                window.location.hash = '';
              } catch (parseError) {
                console.error('❌ 解析 URL hash 數據失敗:', parseError);
              }
            } else {
              console.log('⚠️ URL hash 數據過期，忽略');
              window.location.hash = '';
            }
          }
        }
      } catch (error) {
        console.error('❌ 處理 URL hash 失敗:', error);
      }
    };

    // 檢查是否有遺留的 localStorage 數據 (頁面刷新場景)
    const checkExistingStorageData = () => {
      try {
        // 檢查普通回調數據
        const existingData = localStorage.getItem('ecpay_store_selection');
        if (existingData) {
          const selectionData = JSON.parse(existingData);
          const timeDiff = Date.now() - selectionData.timestamp;
          
          if (timeDiff < 30000 && selectionData.storeData && selectionData.source === 'ecpay_callback') {
            console.log('🔄 發現有效的 localStorage 門市數據，自動載入');
            console.log('🔄 初始檢查數據:', selectionData.storeData);
            
            if (typeof (window as any).handleStoreSelection === 'function') {
              (window as any).handleStoreSelection(selectionData.storeData);
              console.log('✅ 初始檢查 handleStoreSelection 調用完成');
            } else {
              console.error('❌ 初始檢查 handleStoreSelection 函數不存在');
            }
            
            localStorage.removeItem('ecpay_store_selection');
          } else if (timeDiff >= 30000) {
            // 清理過期數據
            localStorage.removeItem('ecpay_store_selection');
          }
        }
        
        // 檢查手動回調數據
        const manualData = localStorage.getItem('ecpay_store_selection_manual');
        if (manualData) {
          console.log('🔄 發現手動 localStorage 門市數據');
          const selectionData = JSON.parse(manualData);
          const timeDiff = Date.now() - selectionData.timestamp;
          
          if (timeDiff < 60000 && selectionData.storeData) { // 手動數據給60秒
            console.log('🔄 手動檢查數據:', selectionData.storeData);
            
            if (typeof (window as any).handleStoreSelection === 'function') {
              (window as any).handleStoreSelection(selectionData.storeData);
              console.log('✅ 手動檢查 handleStoreSelection 調用完成');
            } else {
              console.error('❌ 手動檢查 handleStoreSelection 函數不存在');
            }
            
            localStorage.removeItem('ecpay_store_selection_manual');
          } else {
            // 清理過期數據
            localStorage.removeItem('ecpay_store_selection_manual');
          }
        }
      } catch (error) {
        console.error('❌ 檢查 localStorage 數據失敗:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hashchange', handleHashChange);
    
    // 初始檢查
    checkExistingStorageData();
    handleHashChange(); // 檢查當前是否已有hash

    // 啟動移動端輪詢檢查
    const pollInterval = pollForStorageChanges();

    // 清理函數
    return () => {
      delete (window as any).handleStoreSelection;
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hashchange', handleHashChange);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [onStoreSelect]);

  // 開啟綠界電子地圖選擇器
  const openMapSelector = useCallback(async (logisticsSubType: string = 'UNIMARTC2C') => {
    setIsLoading(true);
    
    try {
      const apiBaseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/stores/map-selector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logisticsSubType,
          isCollection: 'N',
          extraData: 'HAZO_VAPE_STORE_SELECTION'
        })
      });

      if (!response.ok) {
        throw new Error('無法開啟地圖選擇器');
      }

      const data = await response.json();
      
      if (data.success) {
        // 建立表單並自動提交到新視窗
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;
        form.target = 'ecpay_map_window';
        form.style.display = 'none';

        // 添加所有參數
        Object.keys(data.params).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.params[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        
        // 開啟新視窗
        const mapWindow = window.open('', 'ecpay_map_window', 
          'width=800,height=600,scrollbars=yes,resizable=yes'
        );
        
        if (mapWindow) {
          form.submit();
          toast.info('請在彈出視窗中選擇門市，選擇完成後會自動回傳');
          
          // 監控彈窗狀態
          const checkWindowClosed = setInterval(() => {
            if (mapWindow.closed) {
              clearInterval(checkWindowClosed);
              console.log('🔄 ECPay 地圖視窗已關閉');
            }
          }, 1000);
          
          // 30秒後清理監控
          setTimeout(() => {
            clearInterval(checkWindowClosed);
          }, 30000);
          
        } else {
          toast.error('請允許彈出視窗來選擇門市');
        }
        
        // 清理表單
        document.body.removeChild(form);
        
      } else {
        throw new Error(data.message || '地圖選擇器開啟失敗');
      }

    } catch (error) {
      console.error('開啟地圖選擇器錯誤:', error);
      toast.error('無法開啟地圖選擇器，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCopyStoreNumber = async (storeNumber: string) => {
    try {
      await navigator.clipboard.writeText(storeNumber);
      toast.success('店號已複製到剪貼板');
    } catch (error) {
      console.error('複製失敗:', error);
      toast.error('複製失敗');
    }
  };

  const clearSelection = () => {
    onStoreSelect({ id: '', name: '', tel: '', address: '' });
    toast.info('已清除門市選擇');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-3">
        {/* 7-ELEVEN門市選擇按鈕 */}
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => openMapSelector('UNIMARTC2C')}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-medium"
          >
            <MapPin className="w-5 h-5" />
            選擇 7-ELEVEN 門市 (超商交貨便)
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="text-sm text-gray-600">正在開啟地圖選擇器...</div>
          </div>
        )}
      </div>


      {/* 已選擇的門市 */}
      {selectedStore && selectedStore.id && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-green-700">{selectedStore.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">門市編號: {selectedStore.id}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyStoreNumber(selectedStore.id)}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  title="複製店號"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  複製
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                {selectedStore.address}
              </p>
              {selectedStore.tel && (
                <p className="text-sm text-gray-600 mt-1">
                  <Phone className="w-3 h-3 inline mr-1" />
                  {selectedStore.tel}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-100"
              title="清除選擇"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* 使用說明和品牌標識 */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-blue-700">🗺️ 綠界電子地圖選擇器</p>
              <span className="text-xs text-gray-400">by HAZO</span>
            </div>
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">使用說明：</p>
              <ul className="space-y-1 text-blue-600">
                <li>• <strong>點擊超商按鈕</strong>：開啟電子地圖選擇門市</li>
                <li>• <strong>地圖選擇</strong>：在彈出視窗中選擇最近的門市</li>
                <li>• <strong>自動填入</strong>：選擇完成後自動填入門市資訊</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};