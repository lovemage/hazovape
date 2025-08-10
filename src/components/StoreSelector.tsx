import React, { useState, useCallback } from 'react';
import { Search, MapPin, Phone, Copy, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  name: string;
  tel: string;
  address: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'address' | 'number'>('name');
  const [searchResults, setSearchResults] = useState<StoreData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchStores = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const apiBaseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
      const response = await fetch(
        `${apiBaseUrl}/stores/search?query=${encodeURIComponent(searchQuery)}&type=${searchType}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error('搜尋門市失敗');
      }
      
      const data = await response.json();
      setSearchResults(data.stores || []);
      
      if (data.stores.length === 0) {
        toast.info('找不到相關門市，請嘗試其他關鍵字');
      }
    } catch (error) {
      console.error('搜尋門市錯誤:', error);
      toast.error('無法搜尋門市，請稍後再試');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchType]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchStores();
    }
  };

  const handleStoreSelect = (store: StoreData) => {
    onStoreSelect(store);
    setSearchResults([]);
    setSearchQuery('');
    toast.success(`已選擇門市：${store.name}`);
  };

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
        {/* 搜尋類型選擇 */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={searchType === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('name')}
            className="text-xs"
          >
            店名搜尋
          </Button>
          <Button
            type="button"
            variant={searchType === 'address' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('address')}
            className="text-xs"
          >
            地址搜尋
          </Button>
          <Button
            type="button"
            variant={searchType === 'number' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('number')}
            className="text-xs"
          >
            店號搜尋
          </Button>
        </div>

        {/* 搜尋輸入框 */}
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              searchType === 'name' ? '請輸入門市名稱...' :
              searchType === 'address' ? '請輸入地址、城市或區域...' :
              '請輸入6位數店號...'
            }
            className="flex-1"
          />
          <Button
            type="button"
            onClick={searchStores}
            disabled={isLoading || !searchQuery.trim()}
            className="whitespace-nowrap"
          >
            <Search className="w-4 h-4 mr-1" />
            {isLoading ? '搜尋中...' : '搜尋'}
          </Button>
        </div>
      </div>

      {/* 搜尋結果 */}
      {searchResults.length > 0 && (
        <div className="border rounded-lg max-h-60 overflow-y-auto">
          <div className="p-2 bg-gray-50 border-b">
            <p className="text-sm text-gray-600">找到 {searchResults.length} 個門市</p>
          </div>
          <div className="divide-y">
            {searchResults.map((store) => (
              <div
                key={store.id}
                className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleStoreSelect(store)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{store.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {store.address}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-blue-600 font-medium">#{store.id}</span>
                      {store.tel && (
                        <span className="text-xs text-gray-500">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {store.tel}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    選擇
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <Search className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-blue-700">⚡ 閃電7-11選擇器</p>
              <span className="text-xs text-gray-400">by 海水不可斗量工作室</span>
            </div>
            <div className="text-xs text-blue-700">
              <p className="font-medium mb-1">搜尋說明：</p>
              <ul className="space-y-1 text-blue-600">
                <li>• <strong>店名搜尋</strong>：輸入門市名稱關鍵字</li>
                <li>• <strong>地址搜尋</strong>：輸入縣市、區域或地址</li>
                <li>• <strong>店號搜尋</strong>：輸入完整或部分6位數店號</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};