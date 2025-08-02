/**
 * 處理圖片 URL 的工具函數
 */

// 圖片 URL 緩存
const imageUrlCache = new Map<string, string>();

// 獲取圖片基礎 URL
const getImageBaseUrl = () => {
  // 開發環境和生產環境都使用相對路徑
  // 開發環境通過 Vite 代理轉發到 localhost:3001
  // 生產環境直接使用當前域名
  return '';
};

/**
 * 處理圖片路徑，返回完整的圖片 URL
 * @param imagePath 圖片路徑（可能是相對路徑或完整 URL）
 * @returns 完整的圖片 URL
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
  }

  // 檢查緩存
  if (imageUrlCache.has(imagePath)) {
    return imageUrlCache.get(imagePath)!;
  }

  let finalUrl: string;

  // 如果是完整的 URL（http/https），直接使用
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    finalUrl = imagePath;
  } else {
    // 如果是相對路徑，處理為後端靜態文件路徑
    const baseUrl = getImageBaseUrl();

    if (imagePath.startsWith('products/') || imagePath.startsWith('flavors/') || imagePath.startsWith('upsell/')) {
      finalUrl = `${baseUrl}/uploads/${imagePath}`;
    } else {
      finalUrl = `${baseUrl}/uploads/products/${imagePath}`;
    }
  }

  // 緩存結果
  imageUrlCache.set(imagePath, finalUrl);
  return finalUrl;
};

/**
 * 從產品對象中獲取第一張圖片的 URL
 * @param product 產品對象
 * @returns 圖片 URL
 */
export const getProductImageUrl = (product: { images?: string | string[] }): string => {
  let images: string[] = [];

  // 檢查 images 是否存在
  if (!product.images) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
  }

  if (typeof product.images === 'string') {
    try {
      images = JSON.parse(product.images);
    } catch {
      images = [product.images];
    }
  } else if (Array.isArray(product.images)) {
    images = product.images;
  }

  // 返回第一張圖片，如果沒有則使用默認圖片
  if (images.length > 0) {
    return getImageUrl(images[0]);
  }

  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuaaguaXoOWcluePizwvdGV4dD48L3N2Zz4=';
};
