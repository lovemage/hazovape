const crypto = require('crypto');

class ECPayLogistics {
  constructor() {
    // 綠界物流API設定 - 使用測試環境
    this.apiUrl = 'https://logistics-stage.ecpay.com.tw/Helper/GetStoreList';
    this.merchantID = process.env.ECPAY_MERCHANT_ID || '2000132';
    this.platformID = process.env.ECPAY_PLATFORM_ID || '';
    this.hashKey = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
    this.hashIV = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';
  }

  // 產生檢查碼
  generateCheckMacValue(params) {
    try {
      // 1. 參數排序 (排除CheckMacValue)
      const sortedParams = {};
      Object.keys(params)
        .filter(key => key !== 'CheckMacValue')
        .sort()
        .forEach(key => {
          sortedParams[key] = params[key];
        });

      // 2. 組合字串
      let checkStr = `HashKey=${this.hashKey}`;
      for (const [key, value] of Object.entries(sortedParams)) {
        checkStr += `&${key}=${value}`;
      }
      checkStr += `&HashIV=${this.hashIV}`;

      console.log('🔐 檢查碼原始字串:', checkStr);

      // 3. URL encode
      checkStr = encodeURIComponent(checkStr);
      
      // 4. 轉小寫
      checkStr = checkStr.toLowerCase();

      // 5. 解碼某些特殊字符
      checkStr = checkStr.replace(/%2d/g, '-');
      checkStr = checkStr.replace(/%5f/g, '_');
      checkStr = checkStr.replace(/%2e/g, '.');
      checkStr = checkStr.replace(/%21/g, '!');
      checkStr = checkStr.replace(/%2a/g, '*');
      checkStr = checkStr.replace(/%28/g, '(');
      checkStr = checkStr.replace(/%29/g, ')');

      console.log('🔐 處理後字串:', checkStr);

      // 6. SHA256加密
      const hash = crypto.createHash('sha256').update(checkStr).digest('hex');
      
      // 7. 轉大寫
      const result = hash.toUpperCase();
      console.log('🔐 最終檢查碼:', result);
      
      return result;
    } catch (error) {
      console.error('❌ 產生檢查碼失敗:', error);
      throw error;
    }
  }

  // 獲取7-11店舖列表
  async getStoreList(cvsType = 'UNIMART') {
    try {
      console.log('🏪 開始獲取綠界店舖列表:', cvsType);

      // 準備API參數
      const params = {
        PlatformID: this.platformID,
        MerchantID: this.merchantID,
        CvsType: cvsType
      };

      // 產生檢查碼
      params.CheckMacValue = this.generateCheckMacValue(params);

      console.log('📦 API請求參數:', {
        ...params,
        CheckMacValue: params.CheckMacValue.substring(0, 10) + '...'
      });

      // 準備POST請求體
      const formData = new URLSearchParams();
      Object.keys(params).forEach(key => {
        formData.append(key, params[key]);
      });

      // 發送API請求
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP錯誤: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('📥 API回應:', responseText.substring(0, 200) + '...');

      // 解析JSON回應
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON解析失敗:', parseError);
        throw new Error('API回應格式錯誤');
      }

      // 檢查API回應狀態
      if (responseData.RtnCode !== 1) {
        throw new Error(`API錯誤: ${responseData.RtnMsg || '未知錯誤'}`);
      }

      // 處理店舖資料
      const stores = [];
      if (responseData.StoreList && Array.isArray(responseData.StoreList)) {
        for (const storeGroup of responseData.StoreList) {
          if (storeGroup.StoreInfo && Array.isArray(storeGroup.StoreInfo)) {
            for (const store of storeGroup.StoreInfo) {
              stores.push({
                id: store.StoreId,
                name: store.StoreName,
                address: store.StoreAddr,
                tel: store.StorePhone || '',
                cvsType: storeGroup.CvsType
              });
            }
          }
        }
      }

      console.log(`✅ 成功獲取 ${stores.length} 家店舖資料`);
      return {
        success: true,
        stores,
        total: stores.length,
        cvsType
      };

    } catch (error) {
      console.error('❌ 獲取店舖列表失敗:', error);
      return {
        success: false,
        error: error.message,
        stores: [],
        total: 0
      };
    }
  }

  // 搜尋店舖
  async searchStores(query, type = 'name', cvsType = 'UNIMART') {
    try {
      const storeListResult = await this.getStoreList(cvsType);
      
      if (!storeListResult.success) {
        return storeListResult;
      }

      const allStores = storeListResult.stores;
      let filteredStores = [];

      const searchTerm = query.toLowerCase().trim();

      switch (type) {
        case 'name':
          filteredStores = allStores.filter(store => 
            store.name.toLowerCase().includes(searchTerm)
          );
          break;
        
        case 'address':
          filteredStores = allStores.filter(store => 
            store.address.toLowerCase().includes(searchTerm)
          );
          break;
        
        case 'number':
          filteredStores = allStores.filter(store => 
            store.id.toLowerCase().includes(searchTerm)
          );
          break;
        
        default:
          // 綜合搜尋
          filteredStores = allStores.filter(store => 
            store.name.toLowerCase().includes(searchTerm) ||
            store.address.toLowerCase().includes(searchTerm) ||
            store.id.toLowerCase().includes(searchTerm)
          );
      }

      // 限制搜尋結果數量
      const limitedStores = filteredStores.slice(0, 20);

      return {
        success: true,
        stores: limitedStores,
        total: limitedStores.length,
        query,
        type,
        cvsType
      };

    } catch (error) {
      console.error('❌ 搜尋店舖失敗:', error);
      return {
        success: false,
        error: error.message,
        stores: [],
        total: 0
      };
    }
  }
}

module.exports = ECPayLogistics;