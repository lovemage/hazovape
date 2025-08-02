// 測試調試API，檢查規格圖片問題
const https = require('https');

function testDebugAPI(path, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 測試 ${description}...`);
    
    const options = {
      hostname: 'vjvape-production.up.railway.app',
      port: 443,
      path: path,
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
          console.log(`✅ ${description} 響應:`, JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.error(`❌ ${description} 解析JSON失敗:`, error);
          console.log('📄 原始響應:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${description} 請求失敗:`, error);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  try {
    // 測試規格16的詳細信息
    await testDebugAPI('/api/debug/flavors/16', '規格16詳細信息');
    
    // 測試規格列表查詢
    await testDebugAPI('/api/debug/flavors-list', '規格列表查詢');
    
    console.log('\n🎉 所有測試完成！');
  } catch (error) {
    console.error('\n❌ 測試過程中出現錯誤:', error);
  }
}

runTests();