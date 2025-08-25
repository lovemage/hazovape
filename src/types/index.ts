// 產品相關類型
export interface ProductVariant {
  id: number;
  name: string;
  quantity: number;
  price: number; // 規格價格
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  category?: string;
  price: number;
  stock?: number;
  multi_discount?: string | Record<string, number>;
  images?: string | string[];
  image?: string;
  is_active?: boolean;
  disable_coupon?: boolean;
  variants?: ProductVariant[];
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  variants: ProductVariant[];
  subtotal: number;
}

// 口味相關類型
export interface Flavor {
  id: number;
  name: string;
  product_id: number;
  category_id: number;
  stock: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  price?: number | null; // 規格獨立價格，null時使用產品基礎價格
  image?: string | null; // 規格圖片路徑
  category_name?: string;
  product_name?: string;
  product_base_price?: number; // 產品基礎價格
  final_price?: number; // 最終價格（規格價格優先，否則使用產品基礎價格）
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
  product_id: number;
  productName: string;
  product_price: number;
  quantity: number;
  flavors: ProductVariant[] | string[];
  subtotal: number;
  is_upsell: boolean;
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

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  min_order_amount: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  per_user_limit: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponValidationResult {
  coupon: {
    id: number;
    code: string;
    name: string;
    description?: string;
    type: string;
    value: number;
  };
  discountAmount: number;
  freeShipping: boolean;
  message: string;
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
  notes?: string;
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
