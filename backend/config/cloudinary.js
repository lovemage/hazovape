const cloudinary = require('cloudinary').v2;

// 配置 Cloudinary
if (process.env.CLOUDINARY_URL) {
  // 如果設置了 CLOUDINARY_URL環境變數，SDK 會自動解析，無需手動配置
  console.log('✅ 檢測到 CLOUDINARY_URL 環境變數，使用自動配置');
} else {
  // 否則使用手動配置
  cloudinary.config({
    cloud_name: 'dnps7z7p8',
    api_key: '135283526689588',
    api_secret: 'kz8Sq6DqXecKWId8uc3vO24VQ4M',
    secure: true
  });
}

// 測試連接
async function testCloudinaryConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary 連接成功:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary 連接失敗:', error.message);
    return false;
  }
}

// 上傳圖片到 Cloudinary
async function uploadToCloudinary(filePath, options = {}) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'hazo',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      format: 'webp', // 強制轉換為 WebP
      transformation: [
        { quality: 'auto', fetch_format: 'webp' } // 自動優化和 WebP 格式
      ],
      ...options
    });

    console.log('✅ Cloudinary 上傳成功:', result.secure_url);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary 上傳失敗:', error.message);
    throw error;
  }
}

// 從Buffer上傳圖片到 Cloudinary
async function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'hazo',
        resource_type: 'auto',
        format: 'webp', // 強制轉換為 WebP
        transformation: [
          { quality: 'auto', fetch_format: 'webp' } // 自動優化和 WebP 格式
        ],
        ...options
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary Buffer 上傳失敗:', error.message);
          reject(error);
        } else {
          console.log('✅ Cloudinary Buffer 上傳成功:', result.secure_url);
          resolve(result);
        }
      }
    ).end(buffer);
  });
}

// 刪除 Cloudinary 圖片
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Cloudinary 刪除成功:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary 刪除失敗:', error.message);
    throw error;
  }
}

// 從URL提取public_id
function extractPublicIdFromUrl(url) {
  const matches = url.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : null;
}

module.exports = {
  cloudinary,
  testCloudinaryConnection,
  uploadToCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl
};