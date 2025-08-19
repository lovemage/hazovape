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
    // 在window上設定回調函數
    (window as any).handleStoreSelection = (ecpayStoreData: EcpayStoreData) => {
      const storeData: StoreData = {
        id: ecpayStoreData.storeId,
        name: ecpayStoreData.storeName,
        tel: ecpayStoreData.storeTelephone,
        address: ecpayStoreData.storeAddress
      };
      
      onStoreSelect(storeData);
      toast.success(`已選擇門市：${storeData.name}`);
    };

    // 清理函數
    return () => {
      delete (window as any).handleStoreSelection;
    };
  }, [onStoreSelect]);

  // 開啟綠界電子地圖選擇器
  const openMapSelector = useCallback(async (logisticsSubType: string = 'UNIMART') => {
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
          toast.info('請在彈出視窗中選擇門市');
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
            onClick={() => openMapSelector('UNIMART')}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-medium"
          >
            <MapPin className="w-5 h-5" />
            選擇 7-ELEVEN 門市
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