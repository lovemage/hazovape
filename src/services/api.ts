import axios from 'axios';

// 自動檢測 API URL - 使用 Vite 代理
const getApiBaseUrl = () => {
  // 開發環境和生產環境都使用相對路徑
  // 開發環境通過 Vite 代理轉發到 localhost:3001
  // 生產環境直接使用當前域名
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// 調試信息
console.log('🔧 API 配置信息:');
console.log('- DEV 環境:', import.meta.env.DEV);
console.log('- PROD 環境:', import.meta.env.PROD);
console.log('- 當前域名:', window.location.origin);
console.log('- 最終 API_BASE_URL:', API_BASE_URL);
console.log('- 策略: 強制使用當前域名，忽略 VITE_API_URL');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15秒超時，考慮數據庫重連時間
});

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

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 如果是 FormData，移除 Content-Type 讓瀏覽器自動設置
    if (config.data instanceof FormData) {
      console.log('📤 檢測到 FormData，移除 Content-Type 讓瀏覽器自動設置');
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 響應攔截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// 產品相關 API
export const productAPI = {
  getAll: async () => {
    try {
      console.log('嘗試從後端獲取產品數據...');
      const response = await api.get('/products');
      console.log('成功獲取產品數據:', response.data);
      return response;
    } catch (error) {
      console.error('後端API調用失敗:', error);
      console.warn('使用模擬產品數據，因為無法連接到後端');
      return createMockResponse(MOCK_DATA.products);
    }
  },
  getById: async (id: number) => {
    try {
      return await api.get(`/products/${id}`);
    } catch (error) {
      console.warn('使用模擬產品數據');
      const product = MOCK_DATA.products.find(p => p.id === id);
      return createMockResponse(product);
    }
  },
  // 管理員API
  getAllAdmin: () => api.get('/products/admin/all'),
  create: (data: any) => {
    console.log('📤 productAPI.create 調用，數據類型:', data instanceof FormData ? 'FormData' : typeof data);
    return api.post('/products/admin', data);
  },
  update: (id: number, data: any) => {
    console.log('📤 productAPI.update 調用，數據類型:', data instanceof FormData ? 'FormData' : typeof data);
    return api.put(`/products/admin/${id}`, data);
  },
  delete: (id: number) => api.delete(`/products/admin/${id}`), // 軟刪除（停用）
  permanentDelete: (id: number) => api.delete(`/products/admin/${id}/permanent`), // 永久刪除
  restore: (id: number) => api.put(`/products/admin/${id}/restore`),
  uploadImage: (formData: FormData) => api.post('/products/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// 口味相關 API
export const flavorAPI = {
  getAll: async () => {
    try {
      return await api.get('/flavors');
    } catch (error) {
      console.warn('使用模擬口味數據，因為無法連接到後端');
      return createMockResponse(MOCK_DATA.flavors);
    }
  },
  // 管理員API
  getAllAdmin: () => api.get('/flavors/admin/all'),
  create: (data: any) => api.post('/flavors/admin', data),
  update: (id: number, data: any) => api.put(`/flavors/admin/${id}`, data),
  delete: (id: number) => api.delete(`/flavors/admin/${id}`), // 軟刪除（停用）
  permanentDelete: (id: number) => api.delete(`/flavors/admin/${id}/permanent`), // 永久刪除
  restore: (id: number) => api.put(`/flavors/admin/${id}/restore`),
  updateOrder: (orders: { id: number; sort_order: number }[]) =>
    api.put('/flavors/admin/batch-sort', { flavors: orders }),
  getByProduct: (productId: number) => api.get(`/flavors/product/${productId}`)
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

// 網站設置 API
export const settingsAPI = {
  getAll: () => api.get('/api/settings'),
  update: (data: any) => api.put('/api/settings', data),
  updateBatch: (settings: Record<string, any>) => api.put('/api/settings', { settings }),
};

// 產品分類API
export const productCategoryAPI = {
  getAll: () => api.get('/api/product-categories'),
  getAllAdmin: () => api.get('/api/product-categories/admin', {
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  }),
  create: (data: any) => api.post('/api/product-categories/admin', data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  }),
  update: (id: number, data: any) => api.put(`/api/product-categories/admin/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  }),
  delete: (id: number) => api.delete(`/api/product-categories/admin/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
  }),
};

export default api;
