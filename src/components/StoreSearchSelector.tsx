import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Copy, X, ChevronDown, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface Store {
  store_name: string;
  store_id: string;
  address: string;
}

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

interface ParsedStore extends Store {
  city: string;
  district: string;
  road: string;
  fullAddress: string;
}

export const StoreSearchSelector: React.FC<StoreSelectorProps> = ({
  onStoreSelect,
  selectedStore,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedRoad, setSelectedRoad] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // 載入門市數據
  useEffect(() => {
    const loadStores = async () => {
      try {
        const response = await fetch('/stores-711.json');
        const data = await response.json();
        setStores(data.stores || []);
      } catch (error) {
        console.error('載入門市數據失敗:', error);
        toast.error('載入門市數據失敗');
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  // 解析地址並提取縣市、區域、道路信息
  const parsedStores = useMemo(() => {
    return stores.map((store: Store) => {
      const address = store.address;
      
      // 解析地址格式：台北市松山區台北市松山區八德路三段27號
      // 或：台北市松山區八德路三段27號
      let city = '';
      let district = '';
      let road = '';
      let fullAddress = address;

      // 提取縣市
      const cityMatch = address.match(/(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)/);
      if (cityMatch) {
        city = cityMatch[1];
      }

      // 提取區域
      const districtMatch = address.match(/([\u4e00-\u9fa5]+區|[\u4e00-\u9fa5]+鄉|[\u4e00-\u9fa5]+鎮|[\u4e00-\u9fa5]+市)/);
      if (districtMatch) {
        district = districtMatch[1];
      }

      // 提取道路
      const roadMatch = address.match(/([\u4e00-\u9fa5]+路|[\u4e00-\u9fa5]+街|[\u4e00-\u9fa5]+大道|[\u4e00-\u9fa5]+巷)/);
      if (roadMatch) {
        road = roadMatch[1];
      }

      return {
        ...store,
        city,
        district,
        road,
        fullAddress
      } as ParsedStore;
    });
  }, [stores]);

  // 獲取所有縣市
  const cities = useMemo(() => {
    const citySet = new Set(parsedStores.map(store => store.city).filter(Boolean));
    return Array.from(citySet).sort();
  }, [parsedStores]);

  // 獲取選定縣市的區域
  const districts = useMemo(() => {
    if (!selectedCity) return [];
    const districtSet = new Set(
      parsedStores
        .filter(store => store.city === selectedCity)
        .map(store => store.district)
        .filter(Boolean)
    );
    return Array.from(districtSet).sort();
  }, [parsedStores, selectedCity]);

  // 獲取選定區域的道路
  const roads = useMemo(() => {
    if (!selectedCity || !selectedDistrict) return [];
    const roadSet = new Set(
      parsedStores
        .filter(store => store.city === selectedCity && store.district === selectedDistrict)
        .map(store => store.road)
        .filter(Boolean)
    );
    return Array.from(roadSet).sort();
  }, [parsedStores, selectedCity, selectedDistrict]);

  // 過濾門市
  const filteredStores = useMemo(() => {
    let filtered = parsedStores;

    // 按縣市過濾
    if (selectedCity) {
      filtered = filtered.filter(store => store.city === selectedCity);
    }

    // 按區域過濾
    if (selectedDistrict) {
      filtered = filtered.filter(store => store.district === selectedDistrict);
    }

    // 按道路過濾
    if (selectedRoad) {
      filtered = filtered.filter(store => store.road === selectedRoad);
    }

    // 按搜尋詞過濾（店名或店號）
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(store => 
        store.store_name.toLowerCase().includes(term) ||
        store.store_id.toLowerCase().includes(term) ||
        store.fullAddress.toLowerCase().includes(term)
      );
    }

    return filtered.slice(0, 50); // 限制顯示50個結果
  }, [parsedStores, selectedCity, selectedDistrict, selectedRoad, searchTerm]);

  // 重置下級選項
  useEffect(() => {
    if (selectedCity) {
      setSelectedDistrict('');
      setSelectedRoad('');
    }
  }, [selectedCity]);

  useEffect(() => {
    if (selectedDistrict) {
      setSelectedRoad('');
    }
  }, [selectedDistrict]);

  const handleStoreSelect = (store: ParsedStore) => {
    const storeData: StoreData = {
      id: store.store_id,
      name: store.store_name,
      tel: '', // JSON 檔案中沒有電話號碼
      address: store.fullAddress
    };
    
    onStoreSelect(storeData);
    setShowResults(false);
    toast.success(`已選擇門市：${store.store_name}`);
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

  const clearFilters = () => {
    setSelectedCity('');
    setSelectedDistrict('');
    setSelectedRoad('');
    setSearchTerm('');
    setShowResults(false);
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 bg-white rounded-lg border">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">載入門市資料中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 搜尋區域 */}
      <div className="p-4 bg-white rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          7-ELEVEN 門市搜尋
        </h3>
        
        {/* 縣市選擇 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">縣市</label>
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="選擇縣市" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">區域</label>
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={!selectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="選擇區域" />
              </SelectTrigger>
              <SelectContent>
                {districts.map(district => (
                  <SelectItem key={district} value={district}>{district}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">道路</label>
            <Select value={selectedRoad} onValueChange={setSelectedRoad} disabled={!selectedDistrict}>
              <SelectTrigger>
                <SelectValue placeholder="選擇道路" />
              </SelectTrigger>
              <SelectContent>
                {roads.map(road => (
                  <SelectItem key={road} value={road}>{road}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 搜尋框 */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="搜尋店名或店號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            onClick={() => setShowResults(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            搜尋
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
          >
            清除
          </Button>
        </div>

        {/* 搜尋結果統計 */}
        {(selectedCity || selectedDistrict || selectedRoad || searchTerm) && (
          <div className="text-sm text-gray-600 mb-2">
            找到 {filteredStores.length} 間門市
            {filteredStores.length >= 50 && ' (僅顯示前50間)'}
          </div>
        )}
      </div>

      {/* 搜尋結果 */}
      {showResults && filteredStores.length > 0 && (
        <div className="bg-white rounded-lg border max-h-96 overflow-y-auto">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">搜尋結果</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResults(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="divide-y">
            {filteredStores.map((store) => (
              <div
                key={store.store_id}
                className="p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleStoreSelect(store)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{store.store_name}</p>
                    <p className="text-sm text-gray-600">店號: {store.store_id}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {store.fullAddress}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 transform rotate-[-90deg]" />
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

      {/* 使用說明 */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-blue-700 mb-1">🔍 門市搜尋說明</p>
            <div className="text-xs text-blue-600">
              <ul className="space-y-1">
                <li>• <strong>階層搜尋</strong>：依序選擇縣市 → 區域 → 道路縮小範圍</li>
                <li>• <strong>關鍵字搜尋</strong>：輸入店名或店號進行搜尋</li>
                <li>• <strong>組合搜尋</strong>：可同時使用階層選擇和關鍵字搜尋</li>
                <li>• <strong>資料來源</strong>：7-ELEVEN 官方門市資料 (2025/09/25)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
