console.log('🏪 門市回調頁面載入 (POST 處理)');

// 從全局變量獲取數據
const { storeName, storeId, storeAddress } = window.storeData || {};

console.log('🔍 門市參數:', {
    storeName,
    storeId,
    storeAddress
});

if (storeName && storeId) {
    // 構建門市數據
    const storeData = {
        storeId: storeId,
        storeName: storeName,
        storeAddress: storeAddress,
        storeTelephone: '' // 電話號碼通常在綠界回調中沒有提供
    };

    console.log('📦 準備發送的門市數據:', storeData);

    // 多重回調方案確保數據傳遞成功
    let callbackSuccess = false;

    // 方案1: 通過父視窗的全域回調函數 (主要方案)
    if (window.opener && typeof window.opener.handleStoreSelection === 'function') {
        try {
            console.log('✅ 方案1: 使用父視窗全域回調函數');
            window.opener.handleStoreSelection(storeData);
            callbackSuccess = true;
        } catch (error) {
            console.error('❌ 方案1失敗:', error);
        }
    }

    // 方案2: 通過 postMessage 發送 (備選方案)
    if (window.opener) {
        try {
            console.log('✅ 方案2: 使用 postMessage');
            window.opener.postMessage({
                type: 'STORE_SELECTION', // 修正類型名稱
                data: storeData
            }, '*');
            
            // 也發送兼容的舊格式
            window.opener.postMessage({
                type: 'ECPAY_STORE_SELECTION',
                data: storeData
            }, '*');
            
            callbackSuccess = true;
        } catch (error) {
            console.error('❌ 方案2失敗:', error);
        }
    }

    // 方案3: 通過 localStorage 傳遞 (移動端友好方案)
    try {
        console.log('✅ 方案3: 使用 localStorage');
        const selectionData = {
            storeData: storeData,
            timestamp: Date.now(),
            source: 'ecpay_callback'
        };
        localStorage.setItem('ecpay_store_selection', JSON.stringify(selectionData));
        
        // 觸發 storage 事件 (在同一視窗中手動觸發)
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'ecpay_store_selection',
            newValue: JSON.stringify(selectionData),
            oldValue: null
        }));
        
        callbackSuccess = true;
    } catch (error) {
        console.error('❌ 方案3失敗:', error);
    }

    // 更新顯示
    const subtitle = document.getElementById('subtitle');
    const loading = document.getElementById('loading');
    
    if (callbackSuccess) {
        if (subtitle) subtitle.textContent = '門市信息已成功傳送！';
        if (loading) loading.style.display = 'none';
    } else {
        console.error('❌ 所有回調方案都失敗');
        if (subtitle) subtitle.textContent = '錯誤：門市信息傳送失敗';
        if (loading) loading.style.display = 'none';
    }
} else {
    console.error('❌ 門市參數不完整');
    const subtitle = document.getElementById('subtitle');
    const loading = document.getElementById('loading');
    if (subtitle) subtitle.textContent = '錯誤：門市參數不完整';
    if (loading) loading.style.display = 'none';
}

// 3秒後自動關閉視窗
setTimeout(() => {
    console.log('🔄 自動關閉視窗');
    window.close();
}, 3000);
