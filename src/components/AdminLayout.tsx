import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Coffee,
  ShoppingCart,
  Megaphone,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  Lock,
  Globe,
  ExternalLink,
  Plus,
  Home,
  Tag,
  Palette,
  Ticket
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { adminAPI } from '../services/api';
import { AdminUser } from '../types';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // 檢查登入狀態
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    // 載入用戶信息
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('解析用戶信息失敗:', error);
      }
    }
  }, [navigate]);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: '儀表板',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/admin/dashboard',
    },
    {
      id: 'products',
      label: '商品管理',
      icon: <Package className="w-5 h-5" />,
      path: '/admin/products',
    },
    {
      id: 'product-categories',
      label: '產品分類',
      icon: <Tag className="w-5 h-5" />,
      path: '/admin/product-categories',
    },
    {
      id: 'flavors',
      label: '規格管理',
      icon: <Coffee className="w-5 h-5" />,
      path: '/admin/flavors',
    },
    // 隱藏規格類別管理
    // {
    //   id: 'flavor-categories',
    //   label: '規格類別',
    //   icon: <Tags className="w-5 h-5" />,
    //   path: '/admin/flavor-categories',
    // },
    {
      id: 'orders',
      label: '訂單管理',
      icon: <ShoppingCart className="w-5 h-5" />,
      path: '/admin/orders',
    },
    {
      id: 'coupons',
      label: '優惠券管理',
      icon: <Ticket className="w-5 h-5" />,
      path: '/admin/coupons',
    },
    {
      id: 'upsell-products',
      label: '加購商品',
      icon: <Plus className="w-5 h-5" />,
      path: '/admin/upsell-products',
    },
    {
      id: 'announcements',
      label: '公告管理',
      icon: <Megaphone className="w-5 h-5" />,
      path: '/admin/announcements',
    },
    {
      id: 'website-settings',
      label: '網站設置',
      icon: <Globe className="w-5 h-5" />,
      path: '/admin/website-settings',
    },
    {
      id: 'settings',
      label: '系統設置',
      icon: <Settings className="w-5 h-5" />,
      path: '/admin/settings',
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 側邊欄背景遮罩 (移動設備) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 側邊欄 */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ display: 'block' }}>
        <div className="flex flex-col h-full">
          {/* Logo 區域 */}
          <div className="relative flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <img 
              src="/images/logo/vj-logo.png" 
              alt="VJ Vape Logo" 
              className="w-10 h-10"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute right-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 用戶信息 */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center">
                            <div className="w-10 h-10 bg-vape-purple/10 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-vape-purple" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-xs text-gray-500">管理員</p>
                </div>
              </div>
            </div>
          )}

          {/* 導航菜單 */}
          <nav className="flex-1 px-4 py-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center w-full justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${isCurrentPath(item.path) 
                        ? 'bg-vape-purple/10 text-vape-purple border-r-2 border-vape-purple' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 底部區域 */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => window.open('/', '_blank')}
              className="w-full justify-start px-3 py-2 text-left text-vape-purple hover:bg-vape-purple/10 mb-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span className="ml-3">返回網站</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/admin/change-password')}
              className="w-full justify-start px-3 py-2 text-left"
            >
              <Lock className="w-5 h-5" />
              <span className="ml-3">修改密碼</span>
            </Button>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start px-3 py-2 text-left text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">登出</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* 主要內容區域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 頂部導航 */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* 移動設備返回網站按鈕 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/', '_blank')}
              className="sm:hidden text-vape-purple hover:bg-vape-purple/10"
              title="返回網站"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/', '_blank')}
              className="hidden sm:flex items-center gap-2 text-vape-purple border-vape-purple/20 hover:bg-vape-purple/10"
            >
              <ExternalLink className="w-4 h-4" />
              返回網站
            </Button>

            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </span>
          </div>
        </header>

        {/* 主要內容 */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
