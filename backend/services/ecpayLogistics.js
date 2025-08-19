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

  // 產生檢查碼 - 依照綠界規範
  generateCheckMacValue(params) {
    try {
      console.log('🔐 開始生成檢查碼，原始參數:', params);
      
      // 1. 移除CheckMacValue參數並按A-Z排序
      const filteredParams = {};
      Object.keys(params)
        .filter(key => key !== 'CheckMacValue')
        .sort((a, b) => {
          // 依照A-Z字母排序，遇第一個相同時比較第二個，以此類推
          return a.localeCompare(b, 'en', { sensitivity: 'base' });
        })
        .forEach(key => {
          // 確保值為字串且去除前後空白
          filteredParams[key] = String(params[key]).trim();
        });

      console.log('🔐 排序後參數:', filteredParams);

      // 2. 組合字串格式: HashKey=xxx&param1=value1&param2=value2&HashIV=xxx
      let checkStr = `HashKey=${this.hashKey.trim()}`;
      for (const [key, value] of Object.entries(filteredParams)) {
        checkStr += `&${key}=${value}`;
      }
      checkStr += `&HashIV=${this.hashIV.trim()}`;

      console.log('🔐 檢查碼原始字串:', checkStr);

      // 3. URL Encode (依照綠界.NET編碼規範)
      let encodedStr = encodeURIComponent(checkStr);
      
      // 4. 轉小寫
      encodedStr = encodedStr.toLowerCase();

      // 5. 依照綠界.NET編碼(ECPAY)轉換表進行字元替換
      encodedStr = encodedStr.replace(/%2d/g, '-');   // –
      encodedStr = encodedStr.replace(/%5f/g, '_');   // _
      encodedStr = encodedStr.replace(/%2e/g, '.');   // .
      encodedStr = encodedStr.replace(/%21/g, '!');   // !
      encodedStr = encodedStr.replace(/%2a/g, '*');   // *
      encodedStr = encodedStr.replace(/%28/g, '(');   // (
      encodedStr = encodedStr.replace(/%29/g, ')');   // )
      encodedStr = encodedStr.replace(/%20/g, '+');   // space空格
      // 保持這些字符為編碼狀態（不替換）
      // %7e ~, %40 @, %23 #, %24 $, %25 %, %5e ^, %26 &, %3d =, %2b +, %3b ;, %3f ?, %2f /, %5c \, %3e >, %3c <, %60 `, %5b [, %5d ], %7b {, %7d }, %3a :, %27 ', %22 ", %2c ,, %7c |

      console.log('🔐 URL編碼後字串:', encodedStr);

      // 6. SHA256加密
      const hash = crypto.createHash('sha256').update(encodedStr, 'utf8').digest('hex');
      
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

      // 準備API參數 (注意：HashKey和HashIV不能包含在送出的參數中)
      const params = {
        MerchantID: this.merchantID,
        CvsType: cvsType
      };

      // 只有當PlatformID有值時才加入
      if (this.platformID && this.platformID.trim()) {
        params.PlatformID = this.platformID;
      }

      console.log('📦 準備送出的參數（不含CheckMacValue）:', params);

      // 產生檢查碼 - 使用相同的參數
      const checkMacValue = this.generateCheckMacValue(params);
      
      // 重要：確保檢查碼計算和POST的參數完全相符
      const finalParams = {
        ...params,
        CheckMacValue: checkMacValue
      };

      console.log('📦 最終API請求參數:', {
        ...finalParams,
        CheckMacValue: finalParams.CheckMacValue.substring(0, 10) + '...'
      });

      // 準備POST請求體 - 使用完全相同的參數
      const formData = new URLSearchParams();
      Object.keys(finalParams).forEach(key => {
        formData.append(key, finalParams[key]);
      });
      
      console.log('📤 POST請求體內容:', formData.toString());

      // 發送API請求
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
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

  // 測試檢查碼生成的方法
  testCheckMacValue() {
    const testParams = {
      MerchantID: this.merchantID,
      CvsType: 'UNIMART'
    };
    
    console.log('🧪 測試參數:', testParams);
    console.log('🧪 測試用HashKey:', this.hashKey);
    console.log('🧪 測試用HashIV:', this.hashIV);
    
    const checkMac = this.generateCheckMacValue(testParams);
    console.log('🧪 測試生成的CheckMacValue:', checkMac);
    
    return {
      params: testParams,
      checkMacValue: checkMac
    };
  }
}

module.exports = ECPayLogistics;