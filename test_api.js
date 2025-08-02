// 測試API響應，檢查是否包含image字段
const https = require('https');

function testAPI() {
  const options = {
    hostname: 'vjvape-production.up.railway.app',
    port: 443,
    path: '/api/flavors/admin/all',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('🔍 API 響應狀態:', response.success);
        
        if (response.success && response.data && response.data.length > 0) {
          const firstFlavor = response.data[0];
          console.log('📋 第一個規格的所有字段:', Object.keys(firstFlavor));
          console.log('📷 是否包含image字段:', firstFlavor.hasOwnProperty('image'));
          console.log('🔍 image字段值:', firstFlavor.image);
          
          // 找ID=16的規格
          const flavor16 = response.data.find(f => f.id == 16);
          if (flavor16) {
            console.log('🎯 ID=16規格的image:', flavor16.image);
            console.log('🎯 ID=16規格的所有字段:', Object.keys(flavor16));
          } else {
            console.log('❌ 找不到ID=16的規格');
          }
        } else {
          console.log('❌ API響應沒有數據或失敗');
          console.log('📄 完整響應:', data);
        }
      } catch (error) {
        console.error('❌ 解析JSON失敗:', error);
        console.log('📄 原始響應:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ 請求失敗:', error);
  });

  req.end();
}

console.log('🚀 開始測試API...');
testAPI();