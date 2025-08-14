const cloudinary = require('cloudinary').v2;

// 配置 Cloudinary - 根據API Key推導cloud_name
cloudinary.config({
  cloud_name: 'dj9qhzgd8', // 正確的cloud_name
  api_key: '578484754187146',
  api_secret: 'iztUxmCQHI89uaLeKNvXL8tqCkg',
  secure: true
});

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
      folder: options.folder || 'meelfull',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
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
        folder: options.folder || 'meelfull',
        resource_type: 'auto',
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