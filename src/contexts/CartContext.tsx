import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  originalPrice?: number; // 原價，用於顯示優惠
  quantity: number;
  flavors: string[];
  image?: string;
  multiDiscount?: any; // 多件優惠規則
  discountInfo?: {
    type: 'quantity_discount' | 'item_discount';
    display: string;
  };
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'id'> }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'LOAD_CART'; payload: CartItem[] };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem: CartItem = {
        ...action.payload,
        id: Date.now() + Math.random(),
      };
      return {
        ...state,
        items: [...state.items, newItem],
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item
        ).filter(item => item.quantity > 0),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };
    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen,
      };
    case 'OPEN_CART':
      return {
        ...state,
        isOpen: true,
      };
    case 'CLOSE_CART':
      return {
        ...state,
        isOpen: false,
      };
    case 'LOAD_CART':
      return {
        ...state,
        items: action.payload,
      };
    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getDiscountedPrice: (productId: number, quantity: number, originalPrice: number, discountRules?: any) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
  });

  // 從本地存儲加載購物車數據
  useEffect(() => {
    const savedCart = localStorage.getItem('vj-vape-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          dispatch({ type: 'LOAD_CART', payload: parsedCart });
        }
      } catch (error) {
        console.error('載入購物車失敗:', error);
      }
    }
  }, []);

  // 購物車變更時保存到 localStorage
  useEffect(() => {
    if (state.items.length >= 0) {
      localStorage.setItem('vj-vape-cart', JSON.stringify(state.items));
    }
  }, [state.items]);

  const addItem = (item: Omit<CartItem, 'id'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (id: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const openCart = () => {
    dispatch({ type: 'OPEN_CART' });
  };

  const closeCart = () => {
    dispatch({ type: 'CLOSE_CART' });
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return Math.round(state.items.reduce((total, item) => {
      // 如果商品有多件優惠規則，使用優惠價格計算
      if (item.multiDiscount) {
        const discountedPrice = getDiscountedPrice(item.productId, item.quantity, item.originalPrice || item.price, item.multiDiscount);
        return total + discountedPrice;
      }
      // 否則使用原價
      return total + (item.price * item.quantity);
    }, 0));
  };

  const getDiscountedPrice = (productId: number, quantity: number, originalPrice: number, discountRules?: any) => {
    if (!discountRules) return Math.round(originalPrice * quantity);

    const rules = typeof discountRules === 'string' ? JSON.parse(discountRules) : discountRules;

    // 分別處理數量折扣和單件減額
    const quantityDiscounts: Record<number, number> = {};
    const itemDiscounts: Record<number, number> = {};

    Object.entries(rules).forEach(([key, value]) => {
      if (typeof key === 'string' && key.startsWith('item_')) {
        const qty = parseInt(key.replace('item_', ''));
        itemDiscounts[qty] = value as number;
      } else {
        quantityDiscounts[parseInt(key)] = value as number;
      }
    });

    // 先檢查是否有數量折扣
    const applicableQuantityDiscounts = Object.keys(quantityDiscounts)
      .map(Number)
      .filter(minQty => quantity >= minQty)
      .sort((a, b) => b - a);

    if (applicableQuantityDiscounts.length > 0) {
      // 有數量折扣，使用數量折扣
      const bestDiscount = quantityDiscounts[applicableQuantityDiscounts[0]];
      return Math.round(originalPrice * quantity * bestDiscount);
    }

    // 沒有數量折扣，檢查單件減額
    let totalPrice = originalPrice * quantity;

    const applicableItemDiscounts = Object.keys(itemDiscounts)
      .map(Number)
      .filter(startQty => quantity >= startQty)
      .sort((a, b) => a - b); // 從小到大排序

    if (applicableItemDiscounts.length > 0) {
      const startQty = applicableItemDiscounts[0];
      const discountAmount = itemDiscounts[startQty];
      const discountedItems = quantity - startQty + 1;
      totalPrice -= discountAmount * discountedItems;
    }

    return Math.round(Math.max(0, totalPrice));
  };

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
    getTotalItems,
    getTotalPrice,
    getDiscountedPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
