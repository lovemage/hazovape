import axios from 'axios';

// API 配置
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
const currentDomain = window.location.origin;

// 開發環境檢測
const isLocalDev = currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1');

let API_BASE_URL: string;

if (isLocalDev) {
  // 本地開發環境，使用 Vite 代理
  API_BASE_URL = '/api';
} else {
  // 生產環境，使用相對路徑
  API_BASE_URL = '/api';
}

console.log('🔧 API 配置信息:');
console.log('- DEV 環境:', isDev);
console.log('- PROD 環境:', isProd);
console.log('- 當前域名:', currentDomain);
console.log('- 是否本地開發:', isLocalDev);
console.log('- 最終 API_BASE_URL:', API_BASE_URL);

// 創建 axios 實例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 統一設定為 60 秒，解決生產環境數據量大的問題
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 獲取存儲的 token
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 如果是 FormData，移除 Content-Type 讓瀏覽器自動設置
    if (config.data instanceof FormData) {
      console.log('📤 檢測到 FormData，移除 Content-Type 讓瀏覽器自動設置');
      delete config.headers['Content-Type'];
    }

    console.log('📤 API 請求:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期或無效，清除本地存儲並跳轉到登錄頁
      localStorage.removeItem('adminToken');
      if (window.location.pathname.includes('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// 模擬數據
const MOCK_DATA = {
  products: [
    {
      id: 1,
      name: "精選茶葉禮盒",
      price: 299,
      stock: 50,
      multi_discount: { "2": 0.9, "3": 0.8 },
      images: ["product1_1.jpg", "product1_2.jpg"],
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    },
    {
      id: 2,
      name: "經典咖啡豆",
      price: 199,
      stock: 30,
      multi_discount: { "2": 0.95 },
      images: ["product2_1.jpg"],
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    },
    {
      id: 3,
      name: "手工餅乾組合",
      price: 149,
      stock: 100,
      multi_discount: { "3": 0.85, "5": 0.75 },
      images: ["product3_1.jpg", "product3_2.jpg", "product3_3.jpg"],
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  ],
  flavors: [
    { id: 1, name: "茉莉花茶", is_active: true, sort_order: 1, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 2, name: "烏龍茶", is_active: true, sort_order: 2, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 3, name: "普洱茶", is_active: true, sort_order: 3, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 4, name: "綠茶", is_active: true, sort_order: 4, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 5, name: "紅茶", is_active: true, sort_order: 5, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 6, name: "義式濃縮", is_active: true, sort_order: 6, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 7, name: "美式咖啡", is_active: true, sort_order: 7, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 8, name: "卡布奇諾", is_active: true, sort_order: 8, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 9, name: "拿鐵", is_active: true, sort_order: 9, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 10, name: "摩卡", is_active: true, sort_order: 10, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 11, name: "原味", is_active: true, sort_order: 11, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 12, name: "巧克力", is_active: true, sort_order: 12, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 13, name: "草莓", is_active: true, sort_order: 13, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 14, name: "抹茶", is_active: true, sort_order: 14, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
    { id: 15, name: "香草", is_active: true, sort_order: 15, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" }
  ],
  announcements: [
    {
      id: 1,
      title: "歡迎來到 Mist Mall",
      content: "我們提供最優質的茶葉、咖啡和手工餅乾，感謝您的支持！",
      is_active: true,
      priority: 10,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    },
    {
      id: 2,
      title: "新品上架通知",
      content: "精選茶葉禮盒現已上架，限時優惠中！",
      is_active: true,
      priority: 5,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  ]
};

// 創建模擬響應
const createMockResponse = (data: any) => ({
  data: { success: true, data }
});

// 產品相關 API
export const productAPI = {
  getAll: () => api.get('/products'),
  getAllAdmin: () => api.get('/products/admin/all'),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: FormData | any) => {
    console.log('📤 productAPI.create 調用，數據類型:', data instanceof FormData ? 'FormData' : typeof data);
    return api.post('/products/admin', data);
  },
  update: (id: number, data: FormData | any) => api.put(`/products/admin/${id}`, data),
  delete: (id: number) => api.delete(`/products/admin/${id}`), // 軟刪除（停用）
  permanentDelete: (id: number) => api.delete(`/products/admin/${id}/permanent`),
  
  // 更新產品排序
  updateSortOrder: (products: { id: number; sort_order: number }[]) =>
    api.put('/products/admin/update-sort-order', { products }), // 永久刪除
  restore: (id: number) => api.put(`/products/admin/${id}/restore`), // 恢復
  batchImport: (formData: FormData) => {
    console.log('📤 productAPI.batchImport 調用');
    return api.post('/products/admin/batch-import', formData);
  },
};

// 規格相關 API
export const flavorAPI = {
  getAll: async () => {
    try {
      console.log('嘗試從後端獲取規格數據...');
      const response = await api.get('/flavors');
      console.log('成功獲取規格數據:', response.data);
      return response;
    } catch (error) {
      console.warn('使用模擬口味數據，因為無法連接到後端');
      return createMockResponse(MOCK_DATA.flavors);
    }
  },
  // 管理員API
  getAllAdmin: () => api.get('/flavors/admin/all'),
  create: (data: any) => api.post('/flavors/admin', data),
  update: (id: number, data: any) => api.put(`/flavors/admin/${id}`, data),
  // 帶圖片上傳的新增和更新API
  createWithImage: (formData: FormData) => {
    console.log('📤 flavorAPI.createWithImage 調用');
    return api.post('/flavors/admin/with-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateWithImage: (id: number, formData: FormData) => {
    console.log('📤 flavorAPI.updateWithImage 調用，ID:', id);
    return api.put(`/flavors/admin/${id}/with-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id: number) => api.delete(`/flavors/admin/${id}`), // 軟刪除（停用）
  permanentDelete: (id: number) => api.delete(`/flavors/admin/${id}/permanent`), // 永久刪除
  restore: (id: number) => api.put(`/flavors/admin/${id}/restore`),
  updateOrder: (orders: { id: number; sort_order: number }[]) =>
    api.put('/flavors/admin/batch-sort', { flavors: orders }),
  getByProduct: (productId: number) => api.get(`/flavors/product/${productId}`),
  batchImport: (formData: FormData) => {
    console.log('📤 flavorAPI.batchImport 調用');
    return api.post('/flavors/admin/batch-import', formData);
  },
  batchUpdateStock: (data: { flavorIds: number[]; mode: 'set' | 'add' | 'subtract'; value: number }) => {
    console.log('📤 flavorAPI.batchUpdateStock 調用', data);
    return api.put('/flavors/admin/batch-update-stock', data);
  },
  batchUpdateStatus: (data: { flavorIds: number[]; action: 'enable' | 'disable' }) => {
    console.log('📤 flavorAPI.batchUpdateStatus 調用', data);
    return api.put('/flavors/admin/batch-update-status', data);
  },
};

// 優惠券相關 API
export const couponAPI = {
  validate: (data: { code: string; customerPhone: string; subtotal: number }) => 
    api.post('/coupons/validate', data),
  // 管理員API
  getAllAdmin: (params?: { page?: number; limit?: number; search?: string; status?: string }) => 
    api.get('/coupons/admin/all', { params }),
  create: (data: any) => api.post('/coupons/admin', data),
  update: (id: number, data: any) => api.put(`/coupons/admin/${id}`, data),
  delete: (id: number) => api.delete(`/coupons/admin/${id}`),
  getStats: (id: number) => api.get(`/coupons/admin/${id}/stats`),
};

// 口味類別相關 API
export const flavorCategoryAPI = {
  getAll: () => api.get('/flavor-categories'),
  getAllAdmin: () => api.get('/flavor-categories/admin/all'),
  create: (data: any) => api.post('/flavor-categories/admin', data),
  update: (id: number, data: any) => api.put(`/flavor-categories/admin/${id}`, data),
  delete: (id: number) => api.delete(`/flavor-categories/admin/${id}`),
  restore: (id: number) => api.put(`/flavor-categories/admin/${id}/restore`)
};

// 訂單相關 API
export const orderAPI = {
  create: async (data: any) => {
    console.log('📤 發送訂單到後端:', data);
    const response = await api.post('/orders', data);
    console.log('📦 後端響應:', response.data);
    return response;
  },
  getByNumber: (orderNumber: string) => api.get(`/orders/number/${orderNumber}`),
  verify: (orderNumber: string, verificationCode: string) =>
    api.post('/orders/verify', { order_number: orderNumber, verification_code: verificationCode }),
  query: async (orderNumber: string, verificationCode: string) => {
    console.log('🔍 查詢訂單:', { orderNumber, verificationCode });
    const response = await api.post('/orders/query', {
      order_number: orderNumber,
      verification_code: verificationCode
    });
    return response;
  },
  // 管理員API
  getAllAdmin: (params?: any) => api.get('/orders/admin/all', { params }),
  getById: (id: number) => api.get(`/orders/admin/${id}`),
  updateStatus: (id: number, status: string) =>
    api.put(`/orders/admin/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/orders/admin/${id}`),
  batchDelete: (orderIds: number[]) =>
    api.delete('/orders/admin/batch', { data: { order_ids: orderIds } }),
  exportExcel: (orderIds: number[]) =>
    api.post('/orders/admin/export', { order_ids: orderIds }, { responseType: 'blob' }),
  // 運輸單號相關API
  getTracking: (id: number) => api.get(`/orders/admin/${id}/tracking`),
  updateTracking: (id: number, trackingNumber: string) =>
    api.put(`/orders/admin/${id}/tracking`, { tracking_number: trackingNumber }),
};

// 公告相關 API
export const announcementAPI = {
  getActive: async () => {
    try {
      console.log('嘗試從後端獲取公告數據...');
      const response = await api.get('/announcements');
      console.log('成功獲取公告數據:', response.data);
      return response;
    } catch (error) {
      console.error('後端公告API調用失敗:', error);
      console.warn('使用模擬公告數據，因為無法連接到後端');
      return createMockResponse(MOCK_DATA.announcements.filter(a => a.is_active));
    }
  },
  getAll: () => api.get('/announcements/admin/all'),
  create: (data: any) => api.post('/announcements/admin', data),
  update: (id: number, data: any) => api.put(`/announcements/admin/${id}`, data),
  delete: (id: number) => api.delete(`/announcements/admin/${id}`), // 軟刪除（停用）
  permanentDelete: (id: number) => api.delete(`/announcements/admin/${id}/permanent`), // 永久刪除
  restore: (id: number) => api.put(`/announcements/admin/${id}/restore`),
};

// 管理員相關 API
export const adminAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/admin/login', { username, password }),
  getProfile: () => api.get('/admin/profile'),
  getDashboard: () => api.get('/admin/dashboard'),
  getStats: () => api.get('/admin/stats'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings: any) => api.put('/admin/settings', { settings }),
  testTelegram: (data?: any) =>
    api.post('/admin/test-telegram', data || {}),
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.put('/auth/admin/change-password', { currentPassword, newPassword, confirmPassword }),
  
  // 運行數據庫遷移
  migrate: () => api.post('/admin/migrate'),
  
  // 數據備份相關
  exportData: () => api.get('/admin/export-data', { responseType: 'blob' }),
  importData: (file: File) => {
    const formData = new FormData();
    formData.append('backup', file);
    return api.post('/admin/import-data', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// 系統設置相關 API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
  updateBatch: (settings: Record<string, any>) => api.put('/settings', { settings }),
};

// 產品分類API
export const productCategoryAPI = {
  getAll: () => api.get('/product-categories'),
  getAllAdmin: () => api.get('/product-categories/admin'),
  create: (data: any) => api.post('/product-categories/admin', data),
  update: (id: number, data: any) => api.put(`/product-categories/admin/${id}`, data),
  delete: (id: number) => api.delete(`/product-categories/admin/${id}`),
};

export default api;
