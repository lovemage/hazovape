import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product, ProductVariant } from '../types';

// 購物車項目類型
interface CartItem {
  id: string;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  variants: ProductVariant[];
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedFlavors?: ProductVariant[]) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotalQuantity: () => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  // 兼容舊的方法名和接口
  state: CartState;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  getDiscountedPrice: (productId: number, quantity: number, originalPrice: number, discountRules?: any) => number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'id'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLOSE_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem: CartItem = {
        ...action.payload,
        id: `${action.payload.productId}-${action.payload.variants.map(v => v.id).join('-')}-${Date.now()}`
      };
      return {
        ...state,
        items: [...state.items, newItem]
      };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload.id)
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { 
                ...item, 
                quantity: action.payload.quantity,
                subtotal: item.productPrice * action.payload.quantity
              }
            : item
        )
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };
    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen
      };
    case 'CLOSE_CART':
      return {
        ...state,
        isOpen: false
      };
    default:
      return state;
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false
  });

  const addToCart = (product: Product, quantity: number = 1, selectedFlavors: ProductVariant[] = []) => {
    // 計算總價格：如果有規格，使用規格價格總和；否則使用產品價格
    let totalPrice = 0;
    if (selectedFlavors.length > 0) {
      totalPrice = selectedFlavors.reduce((sum, flavor) => sum + (flavor.price * flavor.quantity), 0);
    } else {
      totalPrice = product.price * quantity;
    }

    const subtotal = totalPrice;
    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productPrice: totalPrice / quantity, // 平均單價用於顯示
      quantity,
      variants: selectedFlavors,
      subtotal
    };

    dispatch({
      type: 'ADD_ITEM',
      payload: newItem
    });
  };

  // 兼容舊的addItem方法
  const addItem = (item: CartItem) => {
    dispatch({
      type: 'ADD_ITEM', 
      payload: item
    });
  };

  const removeFromCart = (id: string) => {
    dispatch({
      type: 'REMOVE_ITEM',
      payload: { id }
    });
  };

  const removeItem = (id: string) => {
    removeFromCart(id);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { id, quantity }
      });
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const closeCart = () => {
    dispatch({ type: 'CLOSE_CART' });
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + item.subtotal, 0);
  };

  const getDiscountedPrice = (productId: number, quantity: number, originalPrice: number, discountRules?: any) => {
    if (!discountRules) return originalPrice * quantity;

    let totalPrice = 0;
    let remainingQuantity = quantity;

    // 處理單件減額規則
    const itemDiscounts = Object.entries(discountRules)
      .filter(([key]) => key.startsWith('item_'))
      .map(([key, value]) => ({
        startQuantity: parseInt(key.replace('item_', '')),
        discount: Number(value)
      }))
      .sort((a, b) => a.startQuantity - b.startQuantity);

    if (itemDiscounts.length > 0) {
      for (let i = 1; i <= quantity; i++) {
        let price = originalPrice;
        for (const rule of itemDiscounts) {
          if (i >= rule.startQuantity) {
            price = originalPrice - rule.discount;
          }
        }
        totalPrice += Math.max(0, price);
      }
      return totalPrice;
    }

    // 處理數量折扣規則
    const quantityDiscounts = Object.entries(discountRules)
      .filter(([key]) => !key.startsWith('item_'))
      .map(([quantity, discount]) => ({
        quantity: parseInt(quantity),
        discount: Number(discount)
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const applicableDiscount = quantityDiscounts.find(rule => quantity >= rule.quantity);
    if (applicableDiscount) {
      return originalPrice * quantity * applicableDiscount.discount;
    }

    return originalPrice * quantity;
  };

  const value: CartContextType = {
    items: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalQuantity: getTotalItems,
    getTotalItems: getTotalItems, // 兼容性別名
    getTotalPrice,
    toggleCart,
    isOpen: state.isOpen,
    openCart: toggleCart, // 兼容性接口
    closeCart,
    // 兼容性接口
    state,
    addItem,
    removeItem,
    getDiscountedPrice
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
