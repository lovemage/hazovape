console.log('🏪 門市回調頁面載入 (POST 處理)');

// 從全局變量獲取數據
const { storeName, storeId, storeAddress } = window.storeData || {};

console.log('🔍 門市參數:', {
    storeName,
    storeId,
    storeAddress
});

if (storeName && storeId) {
    // 向父視窗發送門市信息
    if (window.opener) {
        console.log('✅ 向父視窗發送門市數據');
        window.opener.postMessage({
            type: 'STORE_SELECTED',
            storeName: storeName,
            storeId: storeId,
            storeAddress: storeAddress
        }, '*');
        
        // 更新顯示
        const subtitle = document.getElementById('subtitle');
        const loading = document.getElementById('loading');
        if (subtitle) subtitle.textContent = '門市信息已成功傳送！';
        if (loading) loading.style.display = 'none';
    } else {
        console.error('❌ 找不到父視窗');
        const subtitle = document.getElementById('subtitle');
        const loading = document.getElementById('loading');
        if (subtitle) subtitle.textContent = '錯誤：找不到父視窗';
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
