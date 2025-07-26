// 產品相關類型
export interface Product {
  id?: number;
  name: string;
  price: number;
  description?: string;
  stock?: number;
  multi_discount?: string | Record<number, number> | any;
  images?: string[] | string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// 口味相關類型
export interface Flavor {
  id: number;
  name: string;
  product_id: number;
  category_id: number;
  is_active: boolean;
  sort_order: number;
  stock: number;
  product_name?: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

// 口味類別類型
export interface FlavorCategory {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// 訂單相關類型
export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  store_number: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  verification_code?: string;
  is_verified: boolean;
  telegram_sent: boolean;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_price: number; // 數據庫中的實際字段名
  unit_price?: number; // 向後兼容，可選
  quantity: number;
  flavors: string[] | string;
  subtotal: number;
}

// 公告相關類型
export interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// 管理員相關類型
export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

// 儀表板統計類型
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  topProducts: Array<{
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  recentOrders: Order[];
  ordersByStatus: Record<string, number>;
  salesTrend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

// 購物車相關類型（已在 CartContext 中定義）
export interface CustomerInfo {
  name: string;
  phone: string;
  storeNumber: string;
  storeName?: string;
  storeAddress?: string;
}

// API 響應類型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 表單驗證類型
export interface ValidationErrors {
  [key: string]: string | undefined;
}

// 路由參數類型
export interface RouteParams {
  id?: string;
  orderId?: string;
  productId?: string;
}
