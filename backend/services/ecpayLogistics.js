const crypto = require('crypto');

class ECPayLogistics {
  constructor() {
    // 綠界物流API設定 - 使用正式環境
    this.storeListUrl = 'https://logistics.ecpay.com.tw/Helper/GetStoreList';
    this.mapUrl = 'https://logistics.ecpay.com.tw/Express/map';
    this.merchantID = process.env.ECPAY_MERCHANT_ID || '3466445';
    this.platformID = process.env.ECPAY_PLATFORM_ID || '';
    this.hashKey = process.env.ECPAY_HASH_KEY || 'u0mKtzqI07btGNNT';
    this.hashIV = process.env.ECPAY_HASH_IV || 'ZjAbsWWZUvOu8NA0';
  }

  // 產生檢查碼 - 完全按照綠界官方規範
  generateCheckMacValue(params) {
    try {
      console.log('🔐 開始生成檢查碼，原始參數:', params);
      
      // 步驟1: 移除CheckMacValue參數並按A-Z排序
      const sortedKeys = Object.keys(params)
        .filter(key => key !== 'CheckMacValue')
        .sort((a, b) => {
          // 依照第一個英文字母A到Z排序，遇相同時比較第二個字母
          return a.localeCompare(b, 'en', { sensitivity: 'base' });
        });

      // 步驟1: 將參數依順序串連，格式: param1=value1&param2=value2
      let paramString = '';
      sortedKeys.forEach((key, index) => {
        if (index > 0) paramString += '&';
        paramString += `${key}=${params[key]}`;
      });

      console.log('🔐 步驟1 - 排序串連後:', paramString);

      // 步驟2: 參數最前面加上HashKey、最後面加上HashIV
      const hashString = `HashKey=${this.hashKey}&${paramString}&HashIV=${this.hashIV}`;
      console.log('🔐 步驟2 - 加入HashKey/HashIV:', hashString);

      // 步驟3: 進行URL encode
      let encodedString = encodeURIComponent(hashString);
      console.log('🔐 步驟3 - URL編碼:', encodedString);

      // 步驟4: 轉為小寫
      encodedString = encodedString.toLowerCase();
      console.log('🔐 步驟4 - 轉小寫:', encodedString);

      // 步驟5: 依照綠界.NET編碼規範進行字元替換
      encodedString = encodedString.replace(/%2d/g, '-');   // -
      encodedString = encodedString.replace(/%5f/g, '_');   // _
      encodedString = encodedString.replace(/%2e/g, '.');   // .
      encodedString = encodedString.replace(/%21/g, '!');   // !
      encodedString = encodedString.replace(/%2a/g, '*');   // *
      encodedString = encodedString.replace(/%28/g, '(');   // (
      encodedString = encodedString.replace(/%29/g, ')');   // )
      // 注意：空格在encodeURIComponent中會變成%20，但在綠界範例中是+
      
      console.log('🔐 步驟5 - 字元替換後:', encodedString);

      // 步驟6: 使用MD5加密（注意：不是SHA256！）
      const hash = crypto.createHash('md5').update(encodedString, 'utf8').digest('hex');
      console.log('🔐 步驟6 - MD5加密:', hash);

      // 步驟7: 轉大寫產生CheckMacValue
      const result = hash.toUpperCase();
      console.log('🔐 步驟7 - 最終檢查碼:', result);
      
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
      const response = await fetch(this.storeListUrl, {
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
    // 使用官方範例數據進行測試
    const officialTestParams = {
      MerchantID: '2000933',
      MerchantTradeNo: 'A20130312153023',
      MerchantTradeDate: '2013/03/12 15:30:23',
      LogisticsType: 'CVS',
      LogisticsSubType: 'FAMIC2C',
      GoodsAmount: '1000',
      IsCollection: 'N',
      ServerReplyURL: 'https://www.ecpay.com.tw/ServerReplyURL',
      SenderName: '寄件者姓名',
      ReceiverName: '收件者姓名',
      ReceiverStoreID: '001779'
    };

    // 使用官方範例的HashKey和HashIV
    const originalHashKey = this.hashKey;
    const originalHashIV = this.hashIV;
    
    this.hashKey = 'XBERn1YOvpM9nfZc';
    this.hashIV = 'h1ONHk4P4yqbl5LK';
    
    console.log('🧪 官方範例測試');
    console.log('🧪 測試參數:', officialTestParams);
    console.log('🧪 測試用HashKey:', this.hashKey);
    console.log('🧪 測試用HashIV:', this.hashIV);
    
    const officialCheckMac = this.generateCheckMacValue(officialTestParams);
    console.log('🧪 官方範例生成的CheckMacValue:', officialCheckMac);
    console.log('🧪 預期結果應為: 692FD6E2CDB539CCDB7206C76DC239AD');
    
    // 恢復原本的設定
    this.hashKey = originalHashKey;
    this.hashIV = originalHashIV;

    // 測試我們自己的參數
    const ourTestParams = {
      MerchantID: this.merchantID,
      CvsType: 'UNIMART'
    };
    
    const ourCheckMac = this.generateCheckMacValue(ourTestParams);
    
    return {
      officialTest: {
        params: officialTestParams,
        checkMacValue: officialCheckMac,
        expected: '692FD6E2CDB539CCDB7206C76DC239AD',
        isCorrect: officialCheckMac === '692FD6E2CDB539CCDB7206C76DC239AD'
      },
      ourTest: {
        params: ourTestParams,
        checkMacValue: ourCheckMac
      }
    };
  }

  // 生成電子地圖選擇器參數
  generateMapParams(options = {}) {
    try {
      const {
        logisticsType = 'CVS',
        logisticsSubType = 'UNIMART',
        isCollection = 'N',
        serverReplyURL,
        extraData = '',
        device = 0
      } = options;

      // 生成唯一的交易編號
      const now = new Date();
      const merchantTradeNo = `HAZO${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0').substring(0, 2)}`;

      // 基本參數
      const params = {
        MerchantID: this.merchantID,
        MerchantTradeNo: merchantTradeNo,
        LogisticsType: logisticsType,
        LogisticsSubType: logisticsSubType,
        IsCollection: isCollection,
        ServerReplyURL: serverReplyURL || '',
        ExtraData: extraData,
        Device: device.toString()
      };

      // 生成檢查碼
      const checkMacValue = this.generateCheckMacValue(params);
      
      const finalParams = {
        ...params,
        CheckMacValue: checkMacValue
      };

      console.log('🗺️ 電子地圖參數生成完成:', {
        ...finalParams,
        CheckMacValue: finalParams.CheckMacValue.substring(0, 10) + '...'
      });

      return {
        url: this.mapUrl,
        params: finalParams,
        formHtml: this.generateMapFormHtml(finalParams)
      };

    } catch (error) {
      console.error('❌ 生成電子地圖參數失敗:', error);
      throw error;
    }
  }

  // 生成電子地圖表單HTML
  generateMapFormHtml(params) {
    let formHtml = `<form id="ecpayForm" method="post" action="${this.mapUrl}" target="_blank">\n`;
    
    Object.keys(params).forEach(key => {
      formHtml += `  <input type="hidden" name="${key}" value="${params[key]}" />\n`;
    });
    
    formHtml += `  <input type="submit" value="選擇門市" />\n`;
    formHtml += `</form>\n`;
    formHtml += `<script>document.getElementById('ecpayForm').submit();</script>`;
    
    return formHtml;
  }
}

module.exports = ECPayLogistics;